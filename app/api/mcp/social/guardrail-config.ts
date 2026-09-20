import { MAX_REVISION_PASSES } from "@/social-agent/pipeline/guardrail";
import { DAILY_OPENROUTER_SPEND_CAP_USD } from "@/social-agent/reliability/watchdog";
import { MIN_SIGNAL_SCORE_TO_DRAFT } from "@/app/api/cron/social-pipeline/route";

// Read-only reporting of the pipeline's actual safety-threshold constants,
// for the `get_guardrail_config` MCP tool. Every value here is IMPORTED
// from its single source of truth, never re-declared -- so this can never
// drift out of sync with the real values the pipeline enforces, and there
// is deliberately no corresponding write tool: these three numbers are the
// actual safety mechanism (the disclosure hard-gate's revision cap, the
// runaway-cost circuit breaker, the bar for starting a new batch at all),
// not "tone," per the MCP build task's explicit instruction not to expose
// write access to them. A careless chat-driven change to any of these could
// weaken the disclosure hard-gate or the cost cap -- changing them stays a
// code change + review, not a conversational one.
export type GuardrailConfig = {
  maxRevisionPasses: number;
  dailyOpenRouterSpendCapUsd: number;
  minSignalScoreToDraft: number;
};

export function getGuardrailConfig(): GuardrailConfig {
  return {
    maxRevisionPasses: MAX_REVISION_PASSES,
    dailyOpenRouterSpendCapUsd: DAILY_OPENROUTER_SPEND_CAP_USD,
    minSignalScoreToDraft: MIN_SIGNAL_SCORE_TO_DRAFT,
  };
}
