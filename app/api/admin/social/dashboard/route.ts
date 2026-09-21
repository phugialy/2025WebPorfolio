import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseStore } from "@/app/social-agent-adapters/store";
import type { QueryFilter } from "@/social-agent/ports";
import { resolveAccountId } from "@/social-agent/mcp/resolve-account";
import { getBrandProfile } from "@/social-agent/mcp/brand-profile";
import { getRecentRuns, type RecentRun } from "@/social-agent/mcp/recent-runs";
import { buildBrandProfileResource } from "@/social-agent/mcp/resources";
import { getGuardrailConfig } from "@/app/api/mcp/social/guardrail-config";
import { listGuardrailPendingQueue } from "@/app/api/mcp/social/queue-shared";
import { evaluateSocialWatchdog, DAILY_OPENROUTER_SPEND_CAP_USD, type SocialRunRow } from "@/social-agent/reliability/watchdog";

// Read-only admin dashboard for the social-agent subsystem -- modeled
// directly on app/admin/seo/seo-board.tsx's pattern (stat cards + tables,
// one admin API route feeding it), auth-gated the same way as
// app/api/admin/social/queue/route.ts (requireAdminSession, a browser-UI
// Google-session gate -- NOT the MCP server's bearer-token auth).
//
// Every number here is read via an already-existing, already-tested
// function -- nothing is re-queried or re-derived:
//   - recentRuns: social-agent/mcp/recent-runs.ts's getRecentRuns (same
//     logic get_recent_runs / social://... reuse).
//   - guardrailConfig: app/api/mcp/social/guardrail-config.ts's
//     getGuardrailConfig -- the exact values get_guardrail_config and the
//     social://guardrail-rules resource already expose. Display-only here;
//     see settings/route.ts for why there is deliberately no write path.
//   - brandProfile: social-agent/mcp/brand-profile.ts's getBrandProfile,
//     formatted via social-agent/mcp/resources.ts's buildBrandProfileResource
//     (same shape get_brand_profile / social://brand-profile already use).
//   - queuePendingCount: app/api/mcp/social/queue-shared.ts's
//     listGuardrailPendingQueue -- the exact same query
//     app/api/admin/social/queue/route.ts's GET handler runs (that file is
//     off-limits to edit for this task, so this reuses the shared function
//     it and the MCP tools both already call, rather than a third copy of
//     the query).
//   - trailingSpendUsd / dailySpendCapUsd: social-agent/reliability/
//     watchdog.ts's evaluateSocialWatchdog -- the exact pure function the
//     watchdog cron itself uses to sum `social_runs.summary.costUsd` over a
//     trailing window, called here directly (no email side effect, since
//     this route never calls the enclosing runSocialWatchdog orchestrator)
//     against a 24h-scoped fetch of social_runs.
//
// Every section is fetched independently and degrades to a per-section
// `error` string rather than failing the whole response -- same per-step
// failure isolation this project already applies elsewhere (e.g.
// gsc-diagnostics's independent property-format attempts), appropriate
// here since e.g. a missing social_accounts row (pre-Phase-1 provisioning)
// shouldn't prevent the guardrail-config and queue-count sections (which
// don't need an account) from still rendering.

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function fetchTrailingSpend(
  store: ReturnType<typeof createSupabaseStore>,
  accountId?: string
): Promise<{ trailing24hUsd: number; dailySpendCapUsd: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const filters: QueryFilter[] = [{ field: "createdAt", op: "gte", value: since }];
  if (accountId) filters.push({ field: "accountId", op: "eq", value: accountId });

  const runs = await store.list<SocialRunRow>("social_runs", {
    filters,
    orderBy: { field: "createdAt", direction: "desc" },
    limit: 500,
  });

  // evaluateSocialWatchdog reports the spend it summed but not the cap it
  // was evaluated against, so the default cap constant is read directly --
  // the same constant guardrail-config.ts's getGuardrailConfig() imports
  // for the same reason (single source of truth, never re-derived).
  const result = evaluateSocialWatchdog(runs, { tickWindowHours: 24 });
  return { trailing24hUsd: result.dailySpendUsd, dailySpendCapUsd: DAILY_OPENROUTER_SPEND_CAP_USD };
}

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const store = createSupabaseStore();

  let accountId: string | null = null;
  let accountError: string | null = null;
  try {
    const resolved = await resolveAccountId(store);
    if (resolved.ok) accountId = resolved.accountId;
    else accountError = resolved.error;
  } catch (error) {
    accountError = errorMessage(error);
  }

  const [recentRunsSettled, brandProfileSettled, queueSettled, spendSettled] = await Promise.allSettled([
    accountId ? getRecentRuns(store, accountId, 20) : Promise.resolve<RecentRun[]>([]),
    accountId ? getBrandProfile(store, accountId) : Promise.resolve(null),
    listGuardrailPendingQueue(),
    fetchTrailingSpend(store, accountId ?? undefined),
  ]);

  const recentRuns =
    recentRunsSettled.status === "fulfilled"
      ? { runs: recentRunsSettled.value.map((run) => ({ id: run.id, job: run.job, ok: run.ok, summary: run.summary, createdAt: run.createdAt })) }
      : { error: errorMessage(recentRunsSettled.reason) };

  const brandProfile =
    brandProfileSettled.status === "fulfilled"
      ? buildBrandProfileResource(brandProfileSettled.value, accountId ?? "")
      : { found: false, error: errorMessage(brandProfileSettled.reason) };

  const queue =
    queueSettled.status === "fulfilled"
      ? queueSettled.value.ok
        ? { pendingCount: queueSettled.value.posts.length, migrationPending: queueSettled.value.migrationPending ?? false }
        : { error: queueSettled.value.error }
      : { error: errorMessage(queueSettled.reason) };

  const spend =
    spendSettled.status === "fulfilled" ? spendSettled.value : { error: errorMessage(spendSettled.reason) };

  return NextResponse.json({
    accountId,
    accountError,
    recentRuns,
    brandProfile,
    guardrailConfig: getGuardrailConfig(),
    queue,
    spend,
  });
}
