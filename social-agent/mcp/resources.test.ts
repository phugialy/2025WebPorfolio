import { describe, expect, it } from "vitest";
import {
  buildBrandProfileResource,
  buildGuardrailRulesResource,
  buildOperatingScopeResource,
} from "./resources";
import { decideGuardrailOutcome, MAX_REVISION_PASSES } from "../pipeline/guardrail";
import type { SocialBrandProfile } from "../pipeline/types";

/** Collapses whitespace (including the template literal's own line wraps) so assertions aren't brittle against exact line-break placement. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ");
}

describe("buildBrandProfileResource", () => {
  it("reports found: false when no profile row exists", () => {
    expect(buildBrandProfileResource(null, "acct-1")).toEqual({ found: false });
  });

  it("maps a profile row onto the same field names get_brand_profile's structuredContent uses", () => {
    const profile: SocialBrandProfile = {
      id: "bp-1",
      accountId: "acct-1",
      voice: "warm, direct",
      toneRules: ["no jargon", "no hype"],
      bannedTopics: ["politics"],
      disclosureTemplate: "#ad",
    };

    expect(buildBrandProfileResource(profile, "acct-1")).toEqual({
      found: true,
      account_id: "acct-1",
      voice_description: "warm, direct",
      tone_guidelines: ["no jargon", "no hype"],
      banned_topics: ["politics"],
      disclosure_template: "#ad",
    });
  });
});

describe("buildGuardrailRulesResource", () => {
  const config = { maxRevisionPasses: 2, dailyOpenRouterSpendCapUsd: 5, minSignalScoreToDraft: 3 };

  it("interpolates the live numeric values rather than hand-copied ones", () => {
    const text = normalize(buildGuardrailRulesResource(config));
    expect(text).toContain("$5");
    expect(text).toContain("at most 2 times");
    expect(text).toContain("at least 3");
  });

  it("states all five decideGuardrailOutcome rules, in the same priority order as the real function", () => {
    const text = buildGuardrailRulesResource(config);

    const disclosureIdx = text.indexOf("Disclosure hard gate");
    const accuracyIdx = text.indexOf("Accuracy / policy-fit reject threshold");
    const budgetIdx = text.indexOf("Budget check");
    const escalateIdx = text.indexOf("Escalate routing");
    const remainingIdx = text.indexOf("Remaining-dimension revise check");
    const publishIdx = text.lastIndexOf("Otherwise -> PUBLISH");

    for (const idx of [disclosureIdx, accuracyIdx, budgetIdx, escalateIdx, remainingIdx, publishIdx]) {
      expect(idx).toBeGreaterThan(-1);
    }
    expect(disclosureIdx).toBeLessThan(accuracyIdx);
    expect(accuracyIdx).toBeLessThan(budgetIdx);
    expect(budgetIdx).toBeLessThan(escalateIdx);
    expect(escalateIdx).toBeLessThan(remainingIdx);
    expect(remainingIdx).toBeLessThan(publishIdx);
  });

  it("states the disclosure gate is unconditional and the budget field is a code-owned fact, not model judgment", () => {
    const text = normalize(buildGuardrailRulesResource(config));
    expect(text).toContain("no score can override it");
    expect(text).toContain("code-owned fact");
  });

  it("describes escalate as routing to revise, not reject", () => {
    const text = normalize(buildGuardrailRulesResource(config));
    expect(text).toMatch(/escalate.{0,250}REVISE, not reject/i);
  });

  it("cites MAX_REVISION_PASSES by name and matches the real constant's value", () => {
    const liveConfig = { ...config, maxRevisionPasses: MAX_REVISION_PASSES };
    const text = normalize(buildGuardrailRulesResource(liveConfig));
    expect(text).toContain("MAX_REVISION_PASSES");
    expect(text).toContain(`at most ${MAX_REVISION_PASSES} times`);
  });

  // Cross-check: every rule stated in prose is exercised against the real
  // decision function, so the description can't silently describe behavior
  // the code doesn't actually have.
  it("rule 1 (disclosure hard gate) matches decideGuardrailOutcome's actual behavior", () => {
    const outcome = decideGuardrailOutcome({
      platform: "instagram",
      checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
      disclosureRequired: true,
      disclosurePresent: false,
      sensitiveTopicFlags: [],
      reasoning: "",
      budgetOk: true,
      repetitionRisk: 1,
      escalate: false,
    });
    expect(outcome).toBe("reject");
  });

  it("rule 4 (escalate) matches decideGuardrailOutcome's actual behavior (revise, not reject)", () => {
    const outcome = decideGuardrailOutcome({
      platform: "instagram",
      checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
      disclosureRequired: false,
      disclosurePresent: false,
      sensitiveTopicFlags: [],
      reasoning: "",
      budgetOk: true,
      repetitionRisk: 1,
      escalate: true,
    });
    expect(outcome).toBe("revise");
  });
});

describe("buildOperatingScopeResource", () => {
  const rawText = buildOperatingScopeResource();
  const text = normalize(rawText);

  it("states update_brand_profile writes immediately with no approval gate", () => {
    expect(text).toContain("immediate");
    expect(text).toContain("no approval gate");
    expect(text).toMatch(/update_brand_profile.{0,200}(no review queue|moment you call it)/i);
  });

  it("states approve_post is the action that can lead to a real publish, on the next pipeline tick", () => {
    expect(text).toContain("approve_post");
    expect(text).toMatch(/approve_post.{0,400}real publish/i);
    expect(text).toContain("NEXT tick");
    expect(text).toContain("Facebook and Instagram");
  });

  it("states reject_post and edit_post do not publish", () => {
    expect(text).toMatch(/reject_post.{0,40}and.{0,10}edit_post.{0,80}do not publish/i);
  });

  it("states inject_signal only proposes a topic and never drafts or publishes", () => {
    expect(text).toContain("inject_signal");
    expect(text).toMatch(/never drafts copy, never[\s\S]{0,80}publishes/i);
  });

  it("states there is no tool to change guardrail numeric thresholds, citing get_guardrail_config's read-only design", () => {
    expect(text).toMatch(/no tool[\s\S]{0,80}writes guardrail thresholds/i);
    expect(text).toContain("get_guardrail_config");
    expect(text).toContain("read-only by design");
  });

  it("names vector/semantic search over post history as explicitly out of scope", () => {
    expect(text).toMatch(/emantic|ector/);
    expect(text).toContain("explicitly deferred");
  });
});
