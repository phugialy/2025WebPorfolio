import { describe, expect, it } from "vitest";
import { getGuardrailConfig } from "./guardrail-config";
import { MAX_REVISION_PASSES } from "@/social-agent/pipeline/guardrail";
import { DAILY_OPENROUTER_SPEND_CAP_USD } from "@/social-agent/reliability/watchdog";
import { MIN_SIGNAL_SCORE_TO_DRAFT } from "@/app/api/cron/social-pipeline/route";

describe("getGuardrailConfig", () => {
  it("reports the real constants directly from their source, never a re-declared copy", () => {
    expect(getGuardrailConfig()).toEqual({
      maxRevisionPasses: MAX_REVISION_PASSES,
      dailyOpenRouterSpendCapUsd: DAILY_OPENROUTER_SPEND_CAP_USD,
      minSignalScoreToDraft: MIN_SIGNAL_SCORE_TO_DRAFT,
    });
  });
});
