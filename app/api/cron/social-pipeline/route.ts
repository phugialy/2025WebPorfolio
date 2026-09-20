import { NextRequest, NextResponse } from "next/server";
import { createCronAuthGate } from "@/app/social-agent-adapters/auth-gate";
import { createSupabaseStore } from "@/app/social-agent-adapters/store";
import { createOpenRouterLLM } from "@/app/social-agent-adapters/llm";
import { createUnimplementedPlatform } from "@/app/social-agent-adapters/platform";
import { createZernioPlatform } from "@/app/social-agent-adapters/zernio-platform";
import { getOpenRouterConfig } from "@/lib/openrouter";
import { querySearchAnalytics } from "@/lib/gsc";
import { logCronRun } from "@/lib/cron-log";
import { scanSignals, type RawSignalCandidate } from "@/social-agent/pipeline/signal-scan";
import { createPostsForPlatforms, runStateMachineTick, type TickResult } from "@/social-agent/pipeline/state-machine";
import { DAILY_OPENROUTER_SPEND_CAP_USD } from "@/social-agent/reliability/watchdog";
import type { LLM, LLMResult, Message, Usage } from "@/social-agent/ports";
import type { SocialBrandProfile, SocialPlatformName, SocialPost, SocialPostStatus, SocialSignal } from "@/social-agent/pipeline/types";

// Gap 1 (reconciliation pass) -- thin host-glue wiring only, following the
// exact shape of app/api/cron/flag-underperforming/route.ts and
// app/api/cron/social-watchdog/route.ts: auth gate -> try/catch -> log
// outcome. All pipeline decision logic (state transitions, guardrail rules,
// writer prompts) lives in /social-agent/pipeline/* and is only ever called
// here, never duplicated. See the "Reconciliation report" note at the
// bottom of this file for a load-bearing caveat this route surfaced.
//
// Cadence: intended to run every ~1-2h via .github/workflows/social-pipeline.yml
// (GitHub Actions, not Vercel Cron -- see that workflow file and the
// research doc's Decision 1 for why). This route itself doesn't assume
// anything about its own cadence; it just advances whatever is actionable
// right now, per the state machine's own "never decide from scratch"
// discipline.

// ---------------------------------------------------------------------------
// Gap 2 -- cost tracking. Deliberately host-glue, not portable pipeline
// logic (per the task: "cost/pricing is a host-glue concern"). Wraps the
// OpenRouter-backed LLM adapter to accumulate a USD cost estimate across
// every generateText() call made during one tick, then writes the total
// into social_runs.summary.costUsd -- the exact convention
// social-agent/reliability/watchdog.ts already documents and reads
// (DAILY_OPENROUTER_SPEND_CAP_USD, its SocialRunSummary.costUsd comment).
// ---------------------------------------------------------------------------

/**
 * Approximate, HAND-MAINTAINED snapshot of OpenRouter per-model pricing in
 * USD per 1,000,000 tokens (prompt / completion), current as of this file's
 * last edit. This is NOT fetched live from OpenRouter's pricing API -- it
 * will drift from OpenRouter's actual invoiced rates over time, especially
 * for a model not listed here (see DEFAULT_PRICE_USD_PER_MILLION below) or
 * if OpenRouter changes a listed model's price. Keep this in sync manually
 * against https://openrouter.ai/models when models used by
 * OPENROUTER_SOCIAL_MODEL / OPENROUTER_ARTICLE_MODEL change, or periodically
 * otherwise. Treat social_runs.summary.costUsd as a directional estimate for
 * the watchdog's runaway-cost check, never as an invoice-accurate figure.
 */
const OPENROUTER_PRICE_USD_PER_MILLION_TOKENS: Record<string, { prompt: number; completion: number }> = {
  // This repo's actual default (lib/openrouter.ts's getOpenRouterConfig()
  // fallback, and the OPENROUTER_MODEL/OPENROUTER_ARTICLE_MODEL default in
  // .env.example) -- the model this route will almost always resolve to
  // unless OPENROUTER_SOCIAL_MODEL is set.
  "anthropic/claude-3.5-sonnet": { prompt: 3.0, completion: 15.0 },
  "anthropic/claude-3-haiku": { prompt: 0.25, completion: 1.25 },
  "anthropic/claude-3-opus": { prompt: 15.0, completion: 75.0 },
  "openai/gpt-4o": { prompt: 2.5, completion: 10.0 },
  "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "openai/gpt-4.1-mini": { prompt: 0.4, completion: 1.6 },
  "google/gemini-flash-1.5": { prompt: 0.075, completion: 0.3 },
  "meta-llama/llama-3.1-8b-instruct": { prompt: 0.055, completion: 0.055 },
  "meta-llama/llama-3.3-70b-instruct": { prompt: 0.12, completion: 0.3 },
  "mistralai/mistral-small": { prompt: 0.2, completion: 0.6 },
};

/**
 * Fallback rate for a model not in the table above -- deliberately a
 * mid-range, non-zero guess (not $0) so an unlisted/misconfigured model
 * doesn't silently under-report cost to the watchdog's cap check. Still an
 * approximation, and named as such in the summary this route writes.
 */
const DEFAULT_PRICE_USD_PER_MILLION_TOKENS = { prompt: 1.0, completion: 3.0 };

type CostTracker = {
  costUsd: number;
  callsWithUsage: number;
  callsMissingUsage: number;
  modelsSeen: Set<string>;
};

function newCostTracker(): CostTracker {
  return { costUsd: 0, callsWithUsage: 0, callsMissingUsage: 0, modelsSeen: new Set() };
}

/**
 * Estimates one call's USD cost from its returned `usage`. Returns null when
 * there's genuinely nothing to compute from (no usage object at all, or a
 * usage object with no token counts on it whatsoever) -- callers must not
 * treat null as 0, only as "uncounted," so the summary can honestly report
 * how many calls contributed a real number vs. how many didn't.
 */
function estimateCallCostUsd(model: string, usage: Usage | undefined): number | null {
  if (!usage) return null;
  const price = OPENROUTER_PRICE_USD_PER_MILLION_TOKENS[model] ?? DEFAULT_PRICE_USD_PER_MILLION_TOKENS;

  if (typeof usage.promptTokens === "number" || typeof usage.completionTokens === "number") {
    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    return (promptTokens / 1_000_000) * price.prompt + (completionTokens / 1_000_000) * price.completion;
  }

  if (typeof usage.totalTokens === "number") {
    // Some providers only report a combined total, not a prompt/completion
    // split -- fall back to a blended per-token rate. Strictly less accurate
    // than the split case above (a guardrail call's prompt is much larger
    // than its completion, for example), but still better than dropping the
    // call from the total entirely.
    const blended = (price.prompt + price.completion) / 2;
    return (usage.totalTokens / 1_000_000) * blended;
  }

  return null;
}

/** Wraps an `LLM` port implementation to accumulate cost into `tracker` as a side effect, without changing its behavior or return value. */
function createCostTrackingLLM(inner: LLM, defaultModel: string, tracker: CostTracker): LLM {
  return {
    async generateText(messages: Message[], opts?: { model?: string }): Promise<LLMResult> {
      const result = await inner.generateText(messages, opts);
      const usedModel = opts?.model || defaultModel;
      tracker.modelsSeen.add(usedModel);

      const cost = estimateCallCostUsd(usedModel, result.usage);
      if (cost === null) {
        tracker.callsMissingUsage += 1;
      } else {
        tracker.costUsd += cost;
        tracker.callsWithUsage += 1;
      }

      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Signal gathering. The research doc names two sources ("RSS + GSC query
// deltas, already connected in this repo"). Only GSC is wired here -- see
// the "Reconciliation report" note at the bottom of this file for why RSS
// isn't, and for the pre-existing schema mismatch that makes every
// Store call below fail at runtime against the real database today
// regardless of which source is used. Wrapped end-to-end in try/catch so a
// GSC failure (this repo's own GSC connectivity is separately flagged as
// unverified) never blocks the state-machine tick that follows it -- same
// per-step isolation discipline as gsc-diagnostics.ts trying 3 property
// formats independently.
// ---------------------------------------------------------------------------

const GSC_PROPERTY_CANDIDATES = ["sc-domain:phugialy.com", "https://www.phugialy.com/", "https://phugialy.com/"];

async function gatherGscSignalCandidates(): Promise<{ candidates: RawSignalCandidate[]; error?: string }> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let lastError: string | undefined;

  for (const siteUrl of GSC_PROPERTY_CANDIDATES) {
    try {
      const rows = await querySearchAnalytics({ siteUrl, startDate, endDate, dimensions: ["query"], rowLimit: 10 });
      if (rows.length > 0) {
        return {
          candidates: rows.map((row) => ({
            source: "gsc" as const,
            keyword: row.keys[0] ?? "unknown query",
            raw: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
          })),
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { candidates: [], error: lastError };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/** Minimal row shape this route reads from `social_accounts` -- real DB column names (snake_case), since this file talks to Store directly rather than through pipeline/types.ts's (mismatched) local types. See the Reconciliation report below. */
type SocialAccountRow = {
  id: string;
  name: string;
  status: "pending" | "active" | "disconnected";
};

/** `social_runs` row shape this route writes -- matches supabase/migrations/0017_social_agent_foundation.sql's real columns exactly (snake_case), same convention social-agent/reliability/watchdog.ts's own queries already use. */
type SocialRunInsert = {
  account_id: string;
  job: string;
  ok: boolean;
  summary: Record<string, unknown>;
};

const ACTIONABLE_STATUSES: SocialPostStatus[] = [
  "signal_gathered",
  "briefed",
  "drafted",
  "guardrail_pending",
  "approved",
  "publishing",
];

/**
 * Which platforms a fresh batch of posts targets when a tick decides to
 * start one. Defaults to LinkedIn only, matching the research doc's launch
 * scope ("phugialy.com and LinkedIn... then Instagram/Facebook"); override
 * via SOCIAL_PIPELINE_PLATFORMS (comma-separated) once more platforms are
 * ready. Unrecognized values are dropped rather than passed through.
 */
const VALID_PLATFORMS: SocialPlatformName[] = ["instagram", "facebook", "linkedin", "x"];
function resolveTargetPlatforms(): SocialPlatformName[] {
  const raw = process.env.SOCIAL_PIPELINE_PLATFORMS;
  if (!raw) return ["linkedin"];
  const parsed = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is SocialPlatformName => (VALID_PLATFORMS as string[]).includes(p));
  return parsed.length > 0 ? parsed : ["linkedin"];
}

/**
 * A new batch only starts once nothing is already in flight, and only when
 * the best available signal clears this bar -- mirrors the guardrail's own
 * 1-5 scoring scale; a signal-scan score below this is "not worth drafting
 * yet," not a hard rejection.
 *
 * Exported (only change made to this file for the MCP build) so
 * app/api/mcp/social/guardrail-config.ts's read-only `get_guardrail_config`
 * MCP tool can report the real value instead of a second hard-coded copy of
 * it -- that tool deliberately has no write path for this constant (see its
 * own file for why).
 */
export const MIN_SIGNAL_SCORE_TO_DRAFT = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runTick(request: NextRequest) {
  const authGate = createCronAuthGate();
  if (!authGate.isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = createSupabaseStore();
  const model = process.env.OPENROUTER_SOCIAL_MODEL || getOpenRouterConfig().model;
  const tracker = newCostTracker();
  const llm = createCostTrackingLLM(createOpenRouterLLM(), model, tracker);
  // Real Zernio-backed Platform once ZERNIO_API_KEY is set (createZernioPlatform()
  // returns null otherwise, same defensive pattern as createSupabaseAdminClient()),
  // falling back to the logging stub so a deploy without the key doesn't crash.
  const platform = createZernioPlatform() ?? createUnimplementedPlatform();
  const targetPlatforms = resolveTargetPlatforms();

  try {
    const accounts = await store.list<SocialAccountRow>("social_accounts", {});

    if (accounts.length === 0) {
      const summary = { note: "No social_accounts rows exist yet (Phase 1 Zernio provisioning is separate and human-required) -- nothing to tick." };
      await logCronRun("social-pipeline", true, summary);
      return NextResponse.json({ ok: true, accountsProcessed: 0, ...summary });
    }

    const perAccountSummaries: Array<Record<string, unknown>> = [];

    for (const account of accounts) {
      const costBefore = tracker.costUsd;
      let tickResults: TickResult[] = [];
      let seededPlatforms: SocialPlatformName[] = [];
      let signalScan: { written: number; failed: number; gscError?: string } = { written: 0, failed: 0 };
      let stepError: string | undefined;

      try {
        // Trailing-24h spend so far, for the guardrail's budgetOk check --
        // real snake_case columns, matches watchdog.ts's own social_runs
        // query convention exactly (this part of the schema is NOT affected
        // by the mismatch noted below, since this route writes/reads
        // social_runs itself rather than going through pipeline/* code).
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentRuns = await store.list<{ summary: { costUsd?: number } | null }>("social_runs", {
          filters: [
            { field: "account_id", op: "eq", value: account.id },
            { field: "created_at", op: "gte", value: since },
          ],
        });
        const spentTodayUsd = recentRuns.reduce(
          (sum, run) => sum + (typeof run.summary?.costUsd === "number" ? run.summary.costUsd : 0),
          0
        );

        // Brand profile -- best effort, optional on every pipeline call that accepts it.
        let brandProfile: SocialBrandProfile | undefined;
        try {
          const profiles = await store.list<SocialBrandProfile>("social_brand_profile", {
            filters: [{ field: "accountId", op: "eq", value: account.id }],
            limit: 1,
          });
          brandProfile = profiles[0];
        } catch {
          brandProfile = undefined;
        }

        // Signal scan.
        try {
          const { candidates, error: gscError } = await gatherGscSignalCandidates();
          if (candidates.length > 0) {
            const scanned = await scanSignals({ accountId: account.id, store, llm, candidates, model });
            signalScan = { written: scanned.written.length, failed: scanned.failed, gscError };
          } else {
            signalScan = { written: 0, failed: 0, gscError };
          }
        } catch (error) {
          signalScan = { written: 0, failed: 0, gscError: errorMessage(error) };
        }

        // Seed a new batch only when nothing is already actionable for this
        // account, and the best available signal clears the draft bar --
        // this is what keeps one batch in flight at a time instead of the
        // queue growing unbounded every tick.
        try {
          const actionable = await store.list<SocialPost>("social_posts", {
            filters: [
              { field: "accountId", op: "eq", value: account.id },
              { field: "status", op: "in", value: ACTIONABLE_STATUSES },
            ],
          });

          if (actionable.length === 0) {
            const topSignals = await store.list<SocialSignal>("social_signals", {
              filters: [{ field: "accountId", op: "eq", value: account.id }],
              orderBy: { field: "score", direction: "desc" },
              limit: 1,
            });

            if (topSignals.length > 0 && topSignals[0].score >= MIN_SIGNAL_SCORE_TO_DRAFT) {
              await createPostsForPlatforms({ accountId: account.id, store, platforms: targetPlatforms });
              seededPlatforms = targetPlatforms;
            }
          }
        } catch (error) {
          stepError = `seed: ${errorMessage(error)}`;
        }

        // Advance whatever is actionable one step each -- the actual state
        // machine tick (strategist -> writer -> guardrail -> publish, per
        // advancePost's own switch on post.status).
        tickResults = await runStateMachineTick({
          accountId: account.id,
          store,
          llm,
          platform,
          brandProfile,
          spentTodayUsd,
          dailyCapUsd: DAILY_OPENROUTER_SPEND_CAP_USD,
          model,
        });
      } catch (error) {
        stepError = stepError ? `${stepError}; tick: ${errorMessage(error)}` : errorMessage(error);
      }

      const accountCostUsd = Math.round((tracker.costUsd - costBefore) * 1_000_000) / 1_000_000;
      const tickHadPerPostErrors = tickResults.some((r) => r.error);

      const runSummary: SocialRunInsert = {
        account_id: account.id,
        job: "social-pipeline-tick",
        ok: !stepError,
        summary: {
          costUsd: accountCostUsd,
          costTrackingNote:
            "Estimated from a hand-maintained OpenRouter price table, not live pricing -- see OPENROUTER_PRICE_USD_PER_MILLION_TOKENS in this route file.",
          model,
          seededPlatforms,
          signalScan,
          tickResults,
          tickHadPerPostErrors,
          error: stepError,
        },
      };

      try {
        await store.insert<SocialRunInsert>("social_runs", runSummary);
      } catch (error) {
        // Logging the tick's own outcome must never itself crash the route
        // -- record the logging failure in the per-account summary the
        // outer cron_runs entry still captures below.
        stepError = stepError ? `${stepError}; social_runs insert: ${errorMessage(error)}` : `social_runs insert: ${errorMessage(error)}`;
      }

      perAccountSummaries.push({
        accountId: account.id,
        accountName: account.name,
        ok: !stepError,
        costUsd: accountCostUsd,
        seededPlatforms,
        signalScan,
        tickResultCount: tickResults.length,
        tickHadPerPostErrors,
        error: stepError,
      });
    }

    const totalCostUsd = Math.round(tracker.costUsd * 1_000_000) / 1_000_000;
    const outcome = {
      accountsProcessed: accounts.length,
      totalCostUsd,
      model,
      costTracking: {
        callsWithUsage: tracker.callsWithUsage,
        callsMissingUsage: tracker.callsMissingUsage,
        modelsSeen: [...tracker.modelsSeen],
      },
      perAccountSummaries,
    };

    await logCronRun("social-pipeline", true, outcome);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    const message = errorMessage(error);
    await logCronRun("social-pipeline", false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return runTick(request);
}

export async function GET(request: NextRequest) {
  return runTick(request);
}

// ---------------------------------------------------------------------------
// Reconciliation history -- kept for context, not a live warning. The
// camelCase-vs-snake_case mismatch this comment originally documented
// (pipeline code's field names vs. the migration's real columns) has since
// been fixed at the correct layer: app/social-agent-adapters/store.ts now
// translates between the two on every read/write (explicit aliases for
// non-mechanical renames like draftCopy<->draft_text, generic case
// conversion for the rest), and the migration gained the handful of
// genuinely-missing columns it was short (draft_hashtags,
// draft_ready_for_review, revision_count, banned_topics, tone_guidelines as
// an array). app/api/admin/social/queue's routes were fixed separately
// (column-aliased in the GET select, renamed in the PATCH payload). A
// second real bug in this same family -- social-agent/reliability/watchdog.ts
// declaring snake_case fields against the Store's actual camelCase output --
// was found and fixed later still. This route's own direct social_runs
// writes were never affected (written here using the real column names
// directly, not through the Store port). Verified end-to-end via a real
// manual tick against the live database, not just re-reviewed.
// ---------------------------------------------------------------------------
