import { describe, expect, it } from "vitest";
import {
  decideGuardrailOutcome,
  detectDisclosureRequired,
  isBudgetOk,
  reviewDraftWithGuardrail,
  type GuardrailDecisionInput,
} from "./guardrail";
import { createScriptedLLM } from "./test-support";
import type { PlatformDraft, SocialPost } from "./types";

function baseReview(overrides: Partial<GuardrailDecisionInput> = {}): GuardrailDecisionInput {
  return {
    platform: "instagram",
    checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
    disclosureRequired: false,
    disclosurePresent: false,
    sensitiveTopicFlags: [],
    reasoning: "looks good",
    budgetOk: true,
    repetitionRisk: 1,
    escalate: false,
    ...overrides,
  };
}

describe("decideGuardrailOutcome (hard-coded decision rules)", () => {
  it("publishes a clean review", () => {
    expect(decideGuardrailOutcome(baseReview())).toBe("publish");
  });

  it("rejects when disclosure is required but missing -- no score can override this", () => {
    const review = baseReview({ disclosureRequired: true, disclosurePresent: false });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });

  it("still rejects the disclosure gate even with a perfect score everywhere else", () => {
    const review = baseReview({
      disclosureRequired: true,
      disclosurePresent: false,
      checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
      repetitionRisk: 1,
      escalate: false,
    });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });

  it("publishes when disclosure is required and present", () => {
    const review = baseReview({ disclosureRequired: true, disclosurePresent: true });
    expect(decideGuardrailOutcome(review)).toBe("publish");
  });

  it("rejects on factualAccuracy below 4", () => {
    const review = baseReview({ checks: { factualAccuracy: 3, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 } });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });

  it("rejects on platformPolicyFit below 4", () => {
    const review = baseReview({ checks: { factualAccuracy: 5, platformPolicyFit: 2, brandVoiceFit: 5, spamPatternRisk: 5 } });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });

  it("rejects when the budget cap has been exceeded", () => {
    const review = baseReview({ budgetOk: false });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });

  it("routes an escalated post to revise, never straight to publish", () => {
    const review = baseReview({ escalate: true });
    expect(decideGuardrailOutcome(review)).toBe("revise");
  });

  it("revises on a brandVoiceFit of exactly 3", () => {
    const review = baseReview({ checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 3, spamPatternRisk: 5 } });
    expect(decideGuardrailOutcome(review)).toBe("revise");
  });

  it("revises on a spamPatternRisk of exactly 3", () => {
    const review = baseReview({ checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 3 } });
    expect(decideGuardrailOutcome(review)).toBe("revise");
  });

  it("revises on high repetitionRisk", () => {
    const review = baseReview({ repetitionRisk: 4 });
    expect(decideGuardrailOutcome(review)).toBe("revise");
  });

  it("priority order: disclosure gate wins over an otherwise-escalate-only post", () => {
    const review = baseReview({ disclosureRequired: true, disclosurePresent: false, escalate: false, repetitionRisk: 1 });
    expect(decideGuardrailOutcome(review)).toBe("reject");
  });
});

describe("detectDisclosureRequired", () => {
  it("flags affiliate/sponsorship language", () => {
    expect(detectDisclosureRequired("Check out this affiliate link!", { topic: "gear", angle: "review" })).toBe(true);
    expect(detectDisclosureRequired("Sponsored by Acme", { topic: "gear", angle: "review" })).toBe(true);
  });

  it("does not flag ordinary copy", () => {
    expect(detectDisclosureRequired("We shipped a new feature today.", { topic: "product update", angle: "launch" })).toBe(false);
  });
});

describe("isBudgetOk", () => {
  it("is true while under the cap and false at/over it", () => {
    expect(isBudgetOk(0.5, 1)).toBe(true);
    expect(isBudgetOk(1, 1)).toBe(false);
    expect(isBudgetOk(1.5, 1)).toBe(false);
  });
});

const readyDraft: PlatformDraft = {
  platform: "linkedin",
  text: "We shipped a new feature today.",
  hashtags: ["#product"],
  disclosurePresent: false,
  readyForReview: true,
};

describe("reviewDraftWithGuardrail", () => {
  it("auto-rejects without calling the model when the draft was never ready for review", async () => {
    const llm = createScriptedLLM([]);
    const notReady: PlatformDraft = { ...readyDraft, readyForReview: false };

    const verdict = await reviewDraftWithGuardrail({
      draft: notReady,
      brief: { topic: "t", angle: "a" },
      recentPosts: [] as SocialPost[],
      disclosureRequired: false,
      budgetOk: true,
      llm,
    });

    expect(verdict.decision).toBe("reject");
    expect(llm.calls.length).toBe(0);
  });

  it("defaults to reject on a parse failure, same discipline as evaluateProductFit", async () => {
    const llm = createScriptedLLM(["not json at all"]);

    const verdict = await reviewDraftWithGuardrail({
      draft: readyDraft,
      brief: { topic: "t", angle: "a" },
      recentPosts: [],
      disclosureRequired: false,
      budgetOk: true,
      llm,
    });

    expect(verdict.decision).toBe("reject");
  });

  it("merges a valid model response and applies the hard-coded rules to decide publish", async () => {
    const llm = createScriptedLLM([
      {
        checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
        disclosurePresent: false,
        sensitiveTopicFlags: [],
        reasoning: "clean",
        repetitionRisk: 1,
        escalate: false,
      },
    ]);

    const verdict = await reviewDraftWithGuardrail({
      draft: readyDraft,
      brief: { topic: "t", angle: "a" },
      recentPosts: [],
      disclosureRequired: false,
      budgetOk: true,
      llm,
    });

    expect(verdict.decision).toBe("publish");
    expect(llm.calls.length).toBe(1);
  });

  it("ignores a model claiming disclosure isn't required -- disclosureRequired stays code-owned", async () => {
    const llm = createScriptedLLM([
      {
        checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
        disclosurePresent: false,
        sensitiveTopicFlags: [],
        reasoning: "the model thinks this is fine",
        repetitionRisk: 1,
        escalate: false,
        // A malicious/confused model response might even try to smuggle its
        // own disclosureRequired: false -- the code path never reads that
        // field from the parsed response at all, so this has no effect.
        disclosureRequired: false,
      },
    ]);

    const verdict = await reviewDraftWithGuardrail({
      draft: readyDraft,
      brief: { topic: "t", angle: "a" },
      recentPosts: [],
      disclosureRequired: true, // code decided this, e.g. via detectDisclosureRequired
      budgetOk: true,
      llm,
    });

    expect(verdict.disclosureRequired).toBe(true);
    expect(verdict.decision).toBe("reject");
  });
});
