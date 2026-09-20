// Guardrail Critic step -- implements the exact `SocialGuardrailReview`
// contract and hard-coded decision rules from the research doc's
// "Guardrails" section, expanded per the doc's "External review" section
// with `budgetOk` / `repetitionRisk` / `escalate`.
//
// The single most important discipline here, stated explicitly in the task
// that produced this file: "The disclosure hard-gate rule (disclosureRequired
// && !disclosurePresent -> automatic reject, no score can override it) must
// be implemented as actual code logic, not left to the model's own
// judgment -- the LLM call informs the fields, your code enforces the
// rule." `decideGuardrailOutcome` below is that code -- it is a pure
// function with no LLM call in it, specifically so the hard gate can be
// unit-tested without a model in the loop at all.

import type { LLM } from "../ports";
import { clampScore, safeJson } from "./json";
import type { PlatformDraft, SocialBrandProfile, SocialGuardrailReview, SocialPost } from "./types";

const GUARDRAIL_SYSTEM_PROMPT = `You are the Guardrail Critic for a social media manager agent. You review one drafted post before it can be queued for publishing. You do not rewrite the copy -- you evaluate it and report structured findings. The caller's own code, not your judgment, makes the final publish/revise/reject decision from the fields you return -- so report your honest assessment of each field even if you personally think the post is fine overall.

Dimensions to check:
- factualAccuracy (1-5): does the copy make any claim that isn't supported by the brief/context given?
- platformPolicyFit (1-5): would this copy likely trip that platform's content policy or spam detection?
- brandVoiceFit (1-5): does the tone/register match the brand profile given?
- spamPatternRisk (1-5, where 5 = looks nothing like bot spam): repetitive phrasing, engagement-bait, over-uniform cadence -- a distinct check from "is the copy good," since good copy can still trip platform spam detection.
- repetitionRisk (1-5, where higher = more repeated/fatigued): compare the draft against the recent posts given -- has this brand made this same point recently?
- sensitiveTopicFlags: list any health claims, financial-advice framing, or political/current-event adjacency in the copy.
- disclosurePresent: does the copy given ACTUALLY contain a visible disclosure (e.g. "#ad", "Sponsored", "Disclosure:")? Judge only what's in the text, not what the brief says should be there.
- escalate: true if this post touches pricing/terms commitments, complaints, or legal-adjacent topics that should always get mandatory human review regardless of how clean everything else scores.`;

/** Everything the Guardrail Critic's LLM call informs, minus the `decision` field the code below computes independently. */
export type GuardrailDecisionInput = Omit<SocialGuardrailReview, "decision">;

const MAX_REVISION_PASSES = 2; // mirrors the article pipeline's 2-pass cap (Operational reliability section)

/**
 * The hard-coded decision engine. Pure function, no LLM call -- this is
 * what makes the disclosure hard gate provably unconditional rather than a
 * suggestion the model might weigh against other factors.
 *
 * Rules, in priority order, exactly as specified in the research doc:
 * 1. disclosureRequired && !disclosurePresent -> reject, unconditionally.
 * 2. factualAccuracy < 4 || platformPolicyFit < 4 -> reject.
 * 3. !budgetOk -> reject (code-owned spend-cap check, never model judgment).
 * 4. escalate -> revise (routes to mandatory human review, never auto-publish,
 *    but isn't a hard reject either -- distinct per the External review section).
 * 5. Otherwise, any remaining dimension at or below 3 (brandVoiceFit,
 *    spamPatternRisk, or a repetitionRisk of 4+) -> revise.
 * 6. Otherwise -> publish.
 */
export function decideGuardrailOutcome(review: GuardrailDecisionInput): SocialGuardrailReview["decision"] {
  if (review.disclosureRequired && !review.disclosurePresent) return "reject";
  if (review.checks.factualAccuracy < 4 || review.checks.platformPolicyFit < 4) return "reject";
  if (!review.budgetOk) return "reject";
  if (review.escalate) return "revise";

  const needsRevision =
    review.checks.brandVoiceFit <= 3 || review.checks.spamPatternRisk <= 3 || review.repetitionRisk >= 4;
  if (needsRevision) return "revise";

  return "publish";
}

/**
 * Simple, conservative code-side heuristic for whether a draft needs FTC
 * disclosure -- looks for affiliate/sponsorship markers in the brief and
 * draft text. This is the `disclosureRequired` INPUT to the hard gate, not
 * itself part of the gate; deliberately biased toward requiring disclosure
 * (a false positive costs a revise loop, a false negative is a compliance
 * problem) -- same asymmetry as `evaluateProductFit`'s default-to-reject in
 * lib/market-intelligence.ts.
 */
export function detectDisclosureRequired(draftText: string, brief: { topic: string; angle: string }): boolean {
  const haystack = `${draftText} ${brief.topic} ${brief.angle}`.toLowerCase();
  return /affiliate|sponsor|sponsored|\bpaid partnership\b|\bad\b|promo code|commission/.test(haystack);
}

/** Checked against the daily OpenRouter/Zernio spend cap from the Cost model section -- code-owned, passed into the guardrail as a fact, not asked of the model. */
export function isBudgetOk(spentTodayUsd: number, dailyCapUsd: number): boolean {
  return spentTodayUsd < dailyCapUsd;
}

/**
 * Runs the Guardrail Critic's LLM call, merges its output with the
 * code-owned inputs (`disclosureRequired`, `budgetOk`), and applies
 * `decideGuardrailOutcome` to produce the final verdict. On any parse
 * failure, or if the draft was never `readyForReview` in the first place,
 * this defaults to `reject` without even calling the model -- same
 * discipline as `evaluateProductFit` in lib/market-intelligence.ts
 * ("default-to-reject on parse failure, never default-to-approve").
 */
export async function reviewDraftWithGuardrail(params: {
  draft: PlatformDraft;
  brief: { topic: string; angle: string };
  brandProfile?: SocialBrandProfile;
  recentPosts: SocialPost[];
  disclosureRequired: boolean;
  budgetOk: boolean;
  llm: LLM;
  model?: string;
}): Promise<SocialGuardrailReview> {
  const fallbackChecks: GuardrailDecisionInput = {
    platform: params.draft.platform,
    checks: { factualAccuracy: 1, platformPolicyFit: 1, brandVoiceFit: 1, spamPatternRisk: 1 },
    disclosureRequired: params.disclosureRequired,
    disclosurePresent: params.draft.disclosurePresent,
    sensitiveTopicFlags: [],
    reasoning: "",
    budgetOk: params.budgetOk,
    repetitionRisk: 5,
    escalate: true,
  };

  if (!params.draft.readyForReview) {
    const review: GuardrailDecisionInput = {
      ...fallbackChecks,
      reasoning: "No usable draft was produced by the Platform Writer step -- automatic reject, guardrail model not called.",
    };
    return { ...review, decision: "reject" };
  }

  const result = await params.llm.generateText(
    [
      { role: "system", content: GUARDRAIL_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Draft to review (platform: ${params.draft.platform}):
${JSON.stringify({ text: params.draft.text, hashtags: params.draft.hashtags }, null, 2)}

Content brief this draft was written from:
${JSON.stringify(params.brief, null, 2)}

Brand profile:
${JSON.stringify(params.brandProfile ?? { note: "no brand profile on file" }, null, 2)}

Recent published/drafted posts for this account (for repetition comparison):
${JSON.stringify(params.recentPosts.slice(0, 10).map((p) => ({ platform: p.platform, text: p.finalCopy || p.draftCopy })), null, 2)}

Return only JSON matching this shape:
{
  "checks": { "factualAccuracy": 1, "platformPolicyFit": 1, "brandVoiceFit": 1, "spamPatternRisk": 1 },
  "disclosurePresent": boolean,
  "sensitiveTopicFlags": ["string"],
  "reasoning": "string",
  "repetitionRisk": 1,
  "escalate": boolean
}`,
      },
    ],
    { model: params.model }
  );

  const parsed = safeJson<Partial<GuardrailDecisionInput> | null>(result.content, null);
  if (!parsed) {
    const review: GuardrailDecisionInput = {
      ...fallbackChecks,
      reasoning: "Guardrail model response failed to parse -- defaulted to reject, same discipline as evaluateProductFit in lib/market-intelligence.ts.",
    };
    return { ...review, decision: "reject" };
  }

  const merged: GuardrailDecisionInput = {
    platform: params.draft.platform,
    checks: {
      factualAccuracy: clampScore(parsed.checks?.factualAccuracy, 1) as 1 | 2 | 3 | 4 | 5,
      platformPolicyFit: clampScore(parsed.checks?.platformPolicyFit, 1) as 1 | 2 | 3 | 4 | 5,
      brandVoiceFit: clampScore(parsed.checks?.brandVoiceFit, 1) as 1 | 2 | 3 | 4 | 5,
      spamPatternRisk: clampScore(parsed.checks?.spamPatternRisk, 1) as 1 | 2 | 3 | 4 | 5,
    },
    // Code-owned: never trust the model's own opinion on whether disclosure
    // was legally required -- only whether one is visibly present in the text.
    disclosureRequired: params.disclosureRequired,
    disclosurePresent: typeof parsed.disclosurePresent === "boolean" ? parsed.disclosurePresent : params.draft.disclosurePresent,
    sensitiveTopicFlags: Array.isArray(parsed.sensitiveTopicFlags)
      ? parsed.sensitiveTopicFlags.filter((f): f is string => typeof f === "string")
      : [],
    reasoning: parsed.reasoning || "No reasoning provided by guardrail model.",
    budgetOk: params.budgetOk,
    repetitionRisk: clampScore(parsed.repetitionRisk, 3) as 1 | 2 | 3 | 4 | 5,
    escalate: Boolean(parsed.escalate),
  };

  return { ...merged, decision: decideGuardrailOutcome(merged) };
}

export { MAX_REVISION_PASSES };
