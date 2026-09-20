// Local row/contract types for Phase 2 of the social media manager agent.
//
// These describe the `social_*` Supabase tables per the schema sketch in
// docs/research/social-media-manager-agent.md ("Memory layer" section) and
// the task prompt's own "Schema sketch to assume" -- Phase 0 (built by a
// parallel agent) is the real authority on exact column names and the
// actual migration SQL. Treat any mismatch (naming, casing, nullability)
// as reconcilable once that migration lands, not blocking for Phase 2,
// which only needs to typecheck and unit-test against a `Store` (real or
// in-memory), never against a live schema.
//
// Row shapes are deliberately NOT added to ports.ts: this repo's Phase 0
// agent owns that file, and Store<T> is already generic over the row type
// per collection (see ports.ts's own comment on that division of
// responsibility) -- these types are the "T" pipeline code plugs in when
// it calls `store.list<SocialPost>("social_posts", ...)` etc.

import type { Message } from "../ports";

export type SocialPlatformName = "instagram" | "facebook" | "linkedin" | "x";

export type SocialSignalSource = "rss" | "gsc" | "operator";

/** `social_signals` row. */
export type SocialSignal = {
  id: string;
  accountId: string;
  source: SocialSignalSource;
  keyword: string;
  /** 1-5, cheap-model-assigned relevance (operator-injected rows skip scoring -- see injectOperatorSignal). */
  score: number;
  raw?: unknown;
  createdAt: string;
};

/** `social_brand_profile` row. */
export type SocialBrandProfile = {
  id: string;
  accountId: string;
  voice: string;
  toneRules: string[];
  bannedTopics?: string[];
  /** Standing disclosure text/pattern this brand uses when a post needs FTC affiliate disclosure. */
  disclosureTemplate?: string;
};

/**
 * `social_posts.status` state machine, verbatim from the research doc's
 * "Pipeline architecture" section: signal_gathered -> briefed -> drafted ->
 * guardrail_pending -> approved -> publishing -> published, with rejected /
 * publish_failed reachable from any gate. Each tick's job is "find rows
 * stuck in an actionable state, advance them one step" -- never "decide
 * what to do from scratch."
 */
export type SocialPostStatus =
  | "signal_gathered"
  | "briefed"
  | "drafted"
  | "guardrail_pending"
  | "approved"
  | "publishing"
  | "published"
  | "rejected"
  | "publish_failed";

/** `social_posts` row. */
export type SocialPost = {
  id: string;
  accountId: string;
  platform: SocialPlatformName;
  status: SocialPostStatus;
  brief?: ContentBrief;
  draftCopy?: string;
  /** Hashtags/disclosure flag from the Writer step, kept alongside draftCopy so a later tick can reconstruct the full PlatformDraft for the guardrail step without re-calling the Writer. */
  draftHashtags?: string[];
  draftDisclosurePresent?: boolean;
  draftReadyForReview?: boolean;
  finalCopy?: string;
  guardrailVerdict?: SocialGuardrailReview;
  approvedBy?: string;
  rejectionReason?: string;
  /** How many revise-loop passes this post has already gone through -- capped by MAX_REVISION_PASSES in guardrail.ts, same discipline as the article pipeline's 2-pass cap. */
  revisionCount: number;
  scheduledAt?: string;
  publishedAt?: string;
  platformPostId?: string;
  /** Prompt/model version that produced this post, so a later prompt tweak's effect on quality is traceable, per the doc's "Best practices" section. */
  pipelineVersion: string;
  createdAt: string;
  updatedAt: string;
};

/** Strategist output -- not its own table, held on `social_posts.brief`. */
export type ContentBrief = {
  topic: string;
  angle: string;
  keyPoints: string[];
  /** Recent-rejection lessons folded in, per the doc's operator-memory mechanism (layer 6). */
  constraints: string[];
  sourceSignalIds: string[];
};

/** One Platform Writer step's output. */
export type PlatformDraft = {
  platform: SocialPlatformName;
  text: string;
  hashtags: string[];
  disclosurePresent: boolean;
  /**
   * False on any parse failure or empty draft. The state machine and the
   * guardrail step both treat `readyForReview: false` as "not safe to
   * publish or even queue for review" -- the fallback this produces must
   * never be silently treated as a usable draft.
   */
  readyForReview: boolean;
};

/**
 * `SocialGuardrailReview` contract, verbatim from the research doc's
 * "Guardrails" section, expanded with the External review's budgetOk /
 * repetitionRisk / escalate fields.
 */
export type SocialGuardrailReview = {
  decision: "publish" | "revise" | "reject";
  platform: SocialPlatformName;
  checks: {
    factualAccuracy: 1 | 2 | 3 | 4 | 5;
    platformPolicyFit: 1 | 2 | 3 | 4 | 5;
    brandVoiceFit: 1 | 2 | 3 | 4 | 5;
    spamPatternRisk: 1 | 2 | 3 | 4 | 5; // 5 = looks nothing like bot spam
  };
  disclosureRequired: boolean;
  disclosurePresent: boolean;
  sensitiveTopicFlags: string[];
  reasoning: string;
  /** Checked against the daily OpenRouter/Zernio spend cap -- code-owned, never trusted from the model. */
  budgetOk: boolean;
  /** Checked against recent social_posts rows; higher = more repeated/fatigued. */
  repetitionRisk: 1 | 2 | 3 | 4 | 5;
  /** Distinct from reject -- routes to mandatory human review regardless of confidence tier. */
  escalate: boolean;
};

export type { Message };
