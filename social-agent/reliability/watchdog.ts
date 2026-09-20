// Phase 7 (Reliability) -- social media agent watchdog.
//
// The one thing every existing cron in this repo doesn't do: alert, not
// just log ("Operational reliability" in
// docs/research/social-media-manager-agent.md -- "every existing cron in
// this repo only logs, never alerts"). This file is the portable decision
// logic; the actual Resend send and the actual Supabase read live in the
// host-glue route (app/api/cron/social-watchdog/route.ts).
//
// Ports-and-adapters discipline (see ../README.md): this file depends only
// on the `Store` port from ../ports.ts and a plain injected email-sending
// function -- no `@supabase/supabase-js`, no `lib/email.ts`/Resend import,
// no `process.env.*` read anywhere below. That's what makes it testable
// with plain fixtures instead of a live database or a real Resend call.
//
// Two layers on purpose:
//   - `evaluateSocialWatchdog` is a pure function over already-fetched
//     `social_runs` rows -- no I/O at all, trivially unit-testable.
//   - `runSocialWatchdog` is the thin orchestrator: fetches rows via
//     `Store`, calls the pure evaluator, and calls the injected
//     `sendEmail` when something is unhealthy -- testable with a mock
//     `Store` and a spy email function.

import type { Query, QueryFilter, Store } from "../ports";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Daily OpenRouter spend cap in USD -- a small, named, commented constant
 * guarding a real cost risk, mirroring lib/market-intelligence.ts's
 * `MAX_CANDIDATES_PER_RUN` pattern (a hard-coded ceiling with the reasoning
 * next to it, not a bare number).
 *
 * The Cost model section of the research doc targets ~$1/day in ordinary
 * operation. This cap is set to 3x that target, not the target itself,
 * because the watchdog's job here is catching a *runaway* cost bug (a
 * stuck retry loop, a misconfigured model tier calling the frontier model
 * on every tick) -- something clearly, unambiguously wrong -- not flagging
 * routine day-to-day variance around the target. Overridable per call via
 * `WatchdogConfig.dailySpendCapUsd`; this is only the default.
 */
export const DAILY_OPENROUTER_SPEND_CAP_USD = 3;

/**
 * Convention (not a fixed schema field -- `social_runs.summary` is a
 * free-form jsonb column per the Phase 0 migration): pipeline steps that
 * make OpenRouter calls are expected to log their USD cost on this field
 * when they write their `social_runs` row, the same way `job` is a
 * free-text convention rather than an enum. A run that omits this field
 * contributes 0 to the daily sum -- this fails open (a pipeline bug that
 * forgets to log cost won't itself trigger a false cost-cap alert), which
 * is a real limitation worth stating plainly rather than assuming safe.
 */
export type SocialRunSummary = {
  costUsd?: number;
  /**
   * Typed failure classification a pipeline step can set explicitly.
   * `"credential"` is the one value this watchdog currently acts on --
   * distinguishing an expired/revoked Zernio or OpenRouter credential from
   * every other kind of failure (rate limit, bad JSON, network blip, or
   * simply "nothing worth posting today," which is not a failure at all).
   *
   * IDEMPOTENCY / FUTURE HOOK: once Phase 3/5 wire up Zernio's real
   * webhook delivery, its `account.disconnected` handler is the natural
   * place to set `errorType: "credential"` explicitly (and, separately,
   * to dedup webhook deliveries by `X-Zernio-Event-Id` per the doc's
   * Operational reliability section) instead of relying on the text-based
   * heuristic below. That webhook infrastructure doesn't exist yet in
   * this repo, so this watchdog does not implement any event-ID dedup --
   * building a fake version of it now, against no real event stream,
   * isn't worth the maintenance surface. This comment is the marker for
   * where that hook attaches later.
   */
  errorType?: "credential" | string;
  error?: string;
  [key: string]: unknown;
} | null;

/** `social_runs` row shape this watchdog reads (see Phase 0's migration, supabase/migrations/0017_social_agent_foundation.sql). */
export type SocialRunRow = {
  id: string;
  account_id: string;
  job: string;
  ok: boolean;
  summary: SocialRunSummary;
  created_at: string;
};

export type WatchdogFindingCode =
  | "no_recent_activity"
  | "stale_tick"
  | "credential_failure"
  | "cost_cap_exceeded";

export type WatchdogFinding = {
  code: WatchdogFindingCode;
  severity: "critical" | "warning";
  message: string;
};

export type WatchdogResult = {
  healthy: boolean;
  findings: WatchdogFinding[];
  checkedAt: string;
  /** Most recent successful run among whatever rows were passed in, regardless of the lookback window -- useful for reporting even when it falls outside the window that triggered a finding. */
  lastSuccessfulRunAt: string | null;
  /** Summed `summary.costUsd` across rows from the trailing 24h. */
  dailySpendUsd: number;
  runsConsidered: number;
};

export type WatchdogConfig = {
  /**
   * Hours since the last successful tick before it's considered stale.
   * Deliberately a required parameter, not a constant baked into this
   * file -- the doc's pipeline cadence target (every 1-2h) is a
   * deployment/scheduling decision that belongs with the cron route that
   * knows its own actual schedule, not hard-coded in the portable core.
   * See app/api/cron/social-watchdog/route.ts for the concrete value this
   * repo uses and the reasoning behind it.
   */
  tickWindowHours: number;
  /**
   * How far back to look for ANY run at all, to distinguish "the trigger
   * never fired" (GitHub Actions disabled/broken) from "the trigger fires
   * but every tick fails." Defaults to 3x tickWindowHours when omitted.
   */
  activityLookbackHours?: number;
  /** Daily OpenRouter spend cap in USD. Defaults to DAILY_OPENROUTER_SPEND_CAP_USD. */
  dailySpendCapUsd?: number;
  /** Clock override, for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
};

// Heuristic fallback for classifying a failure as credential/auth-shaped
// when a run didn't set the typed `errorType: "credential"` field (see the
// comment on SocialRunSummary above for why a typed signal doesn't exist
// everywhere yet). Deliberately broad rather than narrow -- a false
// positive here just means an ops email says "credential" when it was
// really something else auth-adjacent (e.g. a scope error); a false
// negative means a real credential failure gets reported as a generic
// stale_tick instead, which is the worse outcome to bias against.
const CREDENTIAL_FAILURE_PATTERN =
  /unauthoriz|forbidden|\b401\b|\b403\b|invalid[_ -]?api[_ -]?key|invalid[_ -]?token|expired[_ -]?token|disconnected|revoked|re-?auth/i;

function isCredentialFailure(run: SocialRunRow): boolean {
  if (run.ok) return false;
  const summary = run.summary;
  if (!summary) return false;
  if (summary.errorType === "credential") return true;
  return typeof summary.error === "string" && CREDENTIAL_FAILURE_PATTERN.test(summary.error);
}

function costUsdOf(run: SocialRunRow): number {
  const value = run.summary?.costUsd;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Pure evaluation over already-fetched `social_runs` rows. No I/O -- safe
 * to unit-test directly with plain fixtures and a fixed `now`.
 */
export function evaluateSocialWatchdog(runs: SocialRunRow[], config: WatchdogConfig): WatchdogResult {
  const now = config.now ?? new Date();
  const tickWindowMs = config.tickWindowHours * HOUR_MS;
  const activityLookbackHours = config.activityLookbackHours ?? config.tickWindowHours * 3;
  const activityLookbackMs = activityLookbackHours * HOUR_MS;
  const spendCap = config.dailySpendCapUsd ?? DAILY_OPENROUTER_SPEND_CAP_USD;

  const findings: WatchdogFinding[] = [];

  const withAge = runs
    .map((run) => ({ run, ageMs: now.getTime() - new Date(run.created_at).getTime() }))
    .filter(({ ageMs }) => Number.isFinite(ageMs));

  const runsInLookback = withAge.filter(({ ageMs }) => ageMs >= 0 && ageMs <= activityLookbackMs);

  const successful = withAge.filter(({ run }) => run.ok).sort((a, b) => a.ageMs - b.ageMs);
  const lastSuccessfulRunAt = successful.length > 0 ? successful[0].run.created_at : null;

  if (runsInLookback.length === 0) {
    findings.push({
      code: "no_recent_activity",
      severity: "critical",
      message: `No social_runs rows logged at all in the last ${activityLookbackHours}h -- the trigger (GitHub Actions schedule) itself may be disabled or failing before it ever reaches this app, not just a slow tick.`,
    });
  } else {
    const successfulInWindow = successful.filter(({ ageMs }) => ageMs >= 0 && ageMs <= tickWindowMs);

    if (successfulInWindow.length === 0) {
      // Distinguish "nothing to publish today" (a successful run that
      // simply found no candidates) from a real problem: a successful run
      // in the window means this whole branch is skipped, regardless of
      // what that run's summary says it accomplished. Only get here when
      // NO run in the window succeeded at all.
      const recentFailures = runsInLookback.filter(({ run }) => !run.ok);
      const credentialFailures = recentFailures.filter(({ run }) => isCredentialFailure(run));

      if (credentialFailures.length > 0) {
        const jobs = [...new Set(credentialFailures.map(({ run }) => run.job))];
        findings.push({
          code: "credential_failure",
          severity: "critical",
          message: `${credentialFailures.length} recent run(s) failed with an auth/credential-shaped error (job(s): ${jobs.join(", ")}) -- likely an expired/revoked Zernio or OpenRouter credential, not "nothing to post today."`,
        });
      } else {
        findings.push({
          code: "stale_tick",
          severity: "critical",
          message: `No successful run in the last ${config.tickWindowHours}h despite ${runsInLookback.length} run(s) logged in the last ${activityLookbackHours}h -- the pipeline is executing but not completing successfully.`,
        });
      }
    }
  }

  const dailySpendUsd = withAge
    .filter(({ ageMs }) => ageMs >= 0 && ageMs <= 24 * HOUR_MS)
    .reduce((sum, { run }) => sum + costUsdOf(run), 0);

  if (dailySpendUsd > spendCap) {
    findings.push({
      code: "cost_cap_exceeded",
      severity: "critical",
      message: `Trailing 24h OpenRouter spend is $${dailySpendUsd.toFixed(2)}, over the $${spendCap.toFixed(2)} cap -- likely a runaway loop or a misconfigured model tier, not normal variance.`,
    });
  }

  return {
    healthy: findings.length === 0,
    findings,
    checkedAt: now.toISOString(),
    lastSuccessfulRunAt,
    dailySpendUsd,
    runsConsidered: runs.length,
  };
}

export type WatchdogEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds the alert email content from a `WatchdogResult`. Exported so its shape can be asserted directly in tests without a full `runSocialWatchdog` call. */
export function buildWatchdogEmail(result: WatchdogResult): WatchdogEmail {
  const subject = `Social agent watchdog: ${result.findings.length} issue${result.findings.length === 1 ? "" : "s"} detected`;

  const summaryLines = [
    `Social media agent watchdog check at ${result.checkedAt}`,
    `Last successful run: ${result.lastSuccessfulRunAt ?? "none found"}`,
    `Trailing 24h OpenRouter spend: $${result.dailySpendUsd.toFixed(2)}`,
  ];

  const text = [...summaryLines, "", ...result.findings.map((f) => `- [${f.severity}] ${f.code}: ${f.message}`)].join(
    "\n"
  );

  const html =
    summaryLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("") +
    `<ul>${result.findings
      .map((f) => `<li><strong>[${f.severity}] ${f.code}</strong>: ${escapeHtml(f.message)}</li>`)
      .join("")}</ul>`;

  return { subject, html, text };
}

export type SendEmailFn = (input: WatchdogEmail) => Promise<void>;

export type RunSocialWatchdogDeps = {
  store: Store;
  sendEmail: SendEmailFn;
  config: WatchdogConfig;
  /**
   * Optional -- omit to check `social_runs` across every account. Phase
   * 0's schema is already multi-tenant (`social_runs.account_id`), but
   * with at most one real account provisioned so far (Phase 1's Zernio
   * signup is separate, human-required, out of scope here), checking
   * across all accounts is the safe default for a system-health check.
   * Pass `accountId` once there's a reason to alert per-tenant instead of
   * for the system as a whole.
   */
  accountId?: string;
};

export type RunSocialWatchdogResult = WatchdogResult & {
  emailSent: boolean;
  emailError?: string;
};

/**
 * Orchestrator: fetches `social_runs` via the injected `Store`, evaluates
 * health with the pure function above, and calls the injected `sendEmail`
 * only when unhealthy. A `sendEmail` failure is caught and reported on the
 * result rather than thrown -- an alerting outage shouldn't also make the
 * watchdog cron route itself report failure via `logCronRun`, since the
 * health *check* still completed and its result is still meaningful.
 */
export async function runSocialWatchdog(deps: RunSocialWatchdogDeps): Promise<RunSocialWatchdogResult> {
  const now = deps.config.now ?? new Date();
  const activityLookbackHours = deps.config.activityLookbackHours ?? deps.config.tickWindowHours * 3;
  const since = new Date(now.getTime() - activityLookbackHours * HOUR_MS).toISOString();

  const filters: QueryFilter[] = [{ field: "created_at", op: "gte", value: since }];
  if (deps.accountId) {
    filters.push({ field: "account_id", op: "eq", value: deps.accountId });
  }

  const query: Query = {
    filters,
    orderBy: { field: "created_at", direction: "desc" },
    limit: 500,
  };

  const runs = await deps.store.list<SocialRunRow>("social_runs", query);
  const result = evaluateSocialWatchdog(runs, deps.config);

  if (result.healthy) {
    return { ...result, emailSent: false };
  }

  try {
    await deps.sendEmail(buildWatchdogEmail(result));
    return { ...result, emailSent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Social watchdog: failed to send alert email:", message);
    return { ...result, emailSent: false, emailError: message };
  }
}
