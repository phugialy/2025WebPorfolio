// Strategist step -- reads accumulated signals + social_brand_profile, and
// produces one content brief. Per the research doc's memory-layer section
// (layer 6, "Operator"), recent rejections fold into the brief's
// `constraints` so "the operator tends to reject X" concretely reaches the
// next brief instead of being a vague claim: "the weekly Retro reads a
// sample of recent rejections and folds [it] into the next brief -- this is
// the concrete mechanism for 'the system learns your taste.'" This step
// does that folding directly (not only in a weekly Retro) since every daily
// brief should benefit from it, not just the weekly one.

import type { LLM, Store } from "../ports";
import { safeJson } from "./json";
import type { ContentBrief, SocialBrandProfile, SocialPost, SocialSignal } from "./types";

const STRATEGIST_SYSTEM_PROMPT = `You are the Strategist for a social media manager agent. You read accumulated signals, the brand's voice profile, and a sample of recently rejected drafts, and produce exactly one content brief for today.

Rules:
- Prefer the highest-scored signals, but don't ignore a lower-scored operator-injected signal just because its score is lower than an RSS/GSC one -- read the reasoning, not just the number.
- Every constraint from a recent rejection must be honestly reflected in your brief's own "constraints" list, phrased as a rule to follow (e.g. "avoid pricing claims" not "the operator rejected a pricing claim").
- Do not invent facts about a signal beyond what's given.
- The brief should be usable as-is by a platform-specific copywriter who has never seen the raw signals.`;

/**
 * Builds one content brief for an account from its most recent signals,
 * brand profile, and a sample of recent rejections. Falls back to a
 * deterministic, signal-derived brief (never invented content) if there are
 * no signals at all, or if the model response fails to parse.
 */
export async function buildContentBrief(params: {
  accountId: string;
  store: Store;
  llm: LLM;
  model?: string;
  signalLimit?: number;
  rejectionLimit?: number;
}): Promise<ContentBrief> {
  const signals = await params.store.list<SocialSignal>("social_signals", {
    filters: [{ field: "accountId", op: "eq", value: params.accountId }],
    orderBy: { field: "score", direction: "desc" },
    limit: params.signalLimit ?? 20,
  });

  const brandProfiles = await params.store.list<SocialBrandProfile>("social_brand_profile", {
    filters: [{ field: "accountId", op: "eq", value: params.accountId }],
    limit: 1,
  });
  const brandProfile = brandProfiles[0];

  const recentRejections = await params.store.list<SocialPost>("social_posts", {
    filters: [
      { field: "accountId", op: "eq", value: params.accountId },
      { field: "status", op: "eq", value: "rejected" },
    ],
    orderBy: { field: "createdAt", direction: "desc" },
    limit: params.rejectionLimit ?? 5,
  });

  const rejectionConstraints = recentRejections
    .map((post) => post.rejectionReason)
    .filter((reason): reason is string => Boolean(reason && reason.trim()));

  const fallback: ContentBrief = {
    topic: signals[0]?.keyword ?? "no strong signal available this run",
    angle: signals.length
      ? "Default to the highest-scored available signal; manual review recommended before publishing."
      : "No signals available -- do not draft without operator input.",
    keyPoints: signals.slice(0, 3).map((s) => s.keyword),
    constraints: rejectionConstraints,
    sourceSignalIds: signals.map((s) => s.id),
  };

  if (signals.length === 0) {
    return fallback;
  }

  const result = await params.llm.generateText(
    [
      { role: "system", content: STRATEGIST_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Signals (highest score first):
${JSON.stringify(signals.map((s) => ({ id: s.id, source: s.source, keyword: s.keyword, score: s.score })), null, 2)}

Brand profile:
${JSON.stringify(brandProfile ?? { note: "no brand profile on file -- use a neutral, practical voice" }, null, 2)}

Recent rejections (fold each into "constraints" as a forward-looking rule):
${JSON.stringify(recentRejections.map((r) => ({ platform: r.platform, rejectionReason: r.rejectionReason })), null, 2)}

Return only JSON matching this shape:
{
  "topic": "string",
  "angle": "string",
  "keyPoints": ["string"],
  "constraints": ["string"],
  "sourceSignalIds": ["string"]
}`,
      },
    ],
    { model: params.model }
  );

  const parsed = safeJson<Partial<ContentBrief> | null>(result.content, null);
  if (!parsed) return fallback;

  return {
    topic: parsed.topic?.trim() || fallback.topic,
    angle: parsed.angle?.trim() || fallback.angle,
    keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length ? parsed.keyPoints : fallback.keyPoints,
    // Always keep the code-derived rejection constraints even if the model
    // omitted or reworded some -- these are the hard-won operator-taste
    // signal and must not silently disappear on a partial parse.
    constraints: Array.isArray(parsed.constraints)
      ? Array.from(new Set([...rejectionConstraints, ...parsed.constraints]))
      : fallback.constraints,
    sourceSignalIds:
      Array.isArray(parsed.sourceSignalIds) && parsed.sourceSignalIds.length
        ? parsed.sourceSignalIds
        : fallback.sourceSignalIds,
  };
}
