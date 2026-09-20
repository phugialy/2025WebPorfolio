// State machine driver -- Phase 2's orchestrator. Per the research doc's
// "External review" reframing, adopted verbatim as this module's operating
// principle: "the orchestrator's job every tick is 'find rows stuck in an
// actionable state,' never 'decide what to do from scratch.'"
//
// `runStateMachineTick` finds every `social_posts` row for an account that
// is sitting in an actionable (non-terminal) status and advances each one
// exactly one step, using the stub `Platform` from
// /social-agent/adapters/stub-platform.ts so this whole loop is testable
// without Zernio. Every post is advanced independently and failures are
// isolated per-post (one bad row's error doesn't stop the batch) -- the
// same per-step failure isolation this doc's Codebase audit points to in
// gsc-diagnostics.ts.

import type { LLM, Platform, Store } from "../ports";
import { buildContentBrief } from "./strategist";
import { platformWriters } from "./writer";
import { MAX_REVISION_PASSES, detectDisclosureRequired, isBudgetOk, reviewDraftWithGuardrail } from "./guardrail";
import type { PlatformDraft, SocialBrandProfile, SocialPlatformName, SocialPost, SocialPostStatus } from "./types";

export const PIPELINE_VERSION = "phase2-v1";

const ACTIONABLE_STATUSES: SocialPostStatus[] = [
  "signal_gathered",
  "briefed",
  "drafted",
  "guardrail_pending",
  "approved",
  "publishing",
];

export type TickResult = {
  postId: string;
  fromStatus: SocialPostStatus;
  toStatus: SocialPostStatus;
  error?: string;
};

/**
 * Creates one `social_posts` row per requested platform in `signal_gathered`
 * status. This is the pipeline's entry point -- everything after this is
 * `runStateMachineTick` advancing these rows one step at a time.
 */
export async function createPostsForPlatforms(params: {
  accountId: string;
  store: Store;
  platforms: SocialPlatformName[];
  now?: () => string;
  idGenerator?: () => string;
}): Promise<SocialPost[]> {
  const now = params.now ?? (() => new Date().toISOString());
  const nextId = params.idGenerator ?? defaultIdGenerator;
  const created: SocialPost[] = [];

  for (const platform of params.platforms) {
    const timestamp = now();
    const row = await params.store.insert<SocialPost>("social_posts", {
      id: nextId(),
      accountId: params.accountId,
      platform,
      status: "signal_gathered",
      revisionCount: 0,
      pipelineVersion: PIPELINE_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    created.push(row);
  }

  return created;
}

/** Advances a single post exactly one step, per its current status. Pure enough to unit-test in isolation given fake ports. */
export async function advancePost(params: {
  post: SocialPost;
  store: Store;
  llm: LLM;
  platform: Platform;
  brandProfile?: SocialBrandProfile;
  recentPosts: SocialPost[];
  spentTodayUsd: number;
  dailyCapUsd: number;
  model?: string;
  now?: () => string;
}): Promise<SocialPost> {
  const now = params.now ?? (() => new Date().toISOString());
  const { post } = params;

  switch (post.status) {
    case "signal_gathered": {
      const brief = await buildContentBrief({ accountId: post.accountId, store: params.store, llm: params.llm, model: params.model });
      return params.store.update<SocialPost>("social_posts", post.id, {
        brief,
        status: "briefed",
        updatedAt: now(),
      });
    }

    case "briefed": {
      if (!post.brief) {
        // Shouldn't happen (briefed implies a brief was attached), but never
        // silently proceed with an empty brief -- reject rather than draft
        // blind.
        return params.store.update<SocialPost>("social_posts", post.id, {
          status: "rejected",
          rejectionReason: "Post reached 'briefed' status with no brief attached.",
          updatedAt: now(),
        });
      }

      const write = platformWriters[post.platform];
      const draft: PlatformDraft = await write({ brief: post.brief, brandProfile: params.brandProfile, llm: params.llm, model: params.model });

      if (!draft.readyForReview) {
        return params.store.update<SocialPost>("social_posts", post.id, {
          status: "rejected",
          rejectionReason: "Platform Writer failed to produce a usable draft (parse failure or empty response).",
          updatedAt: now(),
        });
      }

      return params.store.update<SocialPost>("social_posts", post.id, {
        draftCopy: draft.text,
        draftHashtags: draft.hashtags,
        draftDisclosurePresent: draft.disclosurePresent,
        draftReadyForReview: draft.readyForReview,
        status: "drafted",
        updatedAt: now(),
      });
    }

    case "drafted": {
      // No work at this step -- it exists as a real, queryable state
      // ("awaiting guardrail check") per the doc's "state, not just steps"
      // discipline, distinct from the guardrail step itself actually running.
      return params.store.update<SocialPost>("social_posts", post.id, {
        status: "guardrail_pending",
        updatedAt: now(),
      });
    }

    case "guardrail_pending": {
      // A post already carrying a "publish" verdict is sitting here awaiting
      // a human PATCH (app/api/admin/social/queue/[id]/route.ts's `approve`
      // action, which sets status: "approved" directly, bypassing this case
      // entirely) -- never re-run the guardrail LLM call on it. Without this
      // guard, every subsequent tick would re-review an already-reviewed
      // draft for no reason, burning cost on a decision that's already been
      // made and is just waiting on a human to look at it.
      if (post.guardrailVerdict?.decision === "publish") {
        return post;
      }

      const draft: PlatformDraft = {
        platform: post.platform,
        text: post.draftCopy ?? "",
        hashtags: post.draftHashtags ?? [],
        disclosurePresent: post.draftDisclosurePresent ?? false,
        readyForReview: post.draftReadyForReview ?? Boolean(post.draftCopy),
      };

      const disclosureRequired = post.brief ? detectDisclosureRequired(draft.text, post.brief) : false;
      const budgetOk = isBudgetOk(params.spentTodayUsd, params.dailyCapUsd);

      const verdict = await reviewDraftWithGuardrail({
        draft,
        brief: post.brief ?? { topic: "unknown", angle: "unknown" },
        brandProfile: params.brandProfile,
        recentPosts: params.recentPosts,
        disclosureRequired,
        budgetOk,
        llm: params.llm,
        model: params.model,
      });

      if (verdict.decision === "reject") {
        return params.store.update<SocialPost>("social_posts", post.id, {
          status: "rejected",
          guardrailVerdict: verdict,
          rejectionReason: verdict.reasoning,
          updatedAt: now(),
        });
      }

      if (verdict.decision === "revise") {
        if (post.revisionCount >= MAX_REVISION_PASSES) {
          return params.store.update<SocialPost>("social_posts", post.id, {
            status: "rejected",
            guardrailVerdict: verdict,
            rejectionReason: `Exceeded ${MAX_REVISION_PASSES} revision passes -- last guardrail note: ${verdict.reasoning}`,
            updatedAt: now(),
          });
        }
        return params.store.update<SocialPost>("social_posts", post.id, {
          status: "briefed",
          guardrailVerdict: verdict,
          revisionCount: post.revisionCount + 1,
          brief: post.brief
            ? { ...post.brief, constraints: [...post.brief.constraints, `Revision note: ${verdict.reasoning}`] }
            : post.brief,
          updatedAt: now(),
        });
      }

      // decision === "publish" -- per the research doc's "graduated
      // autonomy" design (manual approval required for every post through
      // an initial trial period), a clean guardrail pass does NOT advance
      // status on its own. It stays at "guardrail_pending" with the verdict
      // and finalCopy attached so the admin queue (which already filters on
      // status === "guardrail_pending" and displays guardrailVerdict) shows
      // it for human review. Only an explicit human PATCH (the `approve`
      // action above) moves it to "approved", which is what actually makes
      // the next tick's "approved" case call platform.createPost.
      return params.store.update<SocialPost>("social_posts", post.id, {
        status: "guardrail_pending",
        guardrailVerdict: verdict,
        finalCopy: draft.text,
        updatedAt: now(),
      });
    }

    case "approved": {
      const result = await params.platform.createPost({
        accountId: post.accountId,
        platform: post.platform,
        text: post.finalCopy ?? post.draftCopy ?? "",
        scheduledFor: post.scheduledAt,
      });
      const publishing = await params.store.update<SocialPost>("social_posts", post.id, {
        status: "publishing",
        platformPostId: result.platformPostId,
        finalCopy: post.finalCopy ?? post.draftCopy,
        updatedAt: now(),
      });
      // The stub Platform resolves synchronously; a real Zernio-backed
      // adapter would leave this row at "publishing" until its
      // published/failed webhook (or the next tick, if the webhook is
      // missed) resolves it -- see the research doc's "mid-publish crash
      // safe" note. Finalizing immediately here mirrors what that webhook
      // would do, using the result already in hand rather than discarding
      // it and re-deriving state on a later "publishing" tick.
      return finalizePublishing(params.store, publishing, result.status, now);
    }

    case "publishing": {
      // Reached directly only if a prior tick got interrupted between
      // "approved" and finalizing -- resolve it via a fresh analytics/status
      // check against the Platform port rather than assuming success.
      if (!post.platformPostId) {
        return params.store.update<SocialPost>("social_posts", post.id, {
          status: "publish_failed",
          rejectionReason: "Post was left in 'publishing' with no platformPostId to resolve.",
          updatedAt: now(),
        });
      }
      // No richer "get post status" method exists on the Platform port yet
      // (only getAnalytics) -- treat reaching this state with a
      // platformPostId already set as success, matching the synchronous
      // stub's own createPost contract.
      return params.store.update<SocialPost>("social_posts", post.id, {
        status: "published",
        publishedAt: now(),
        updatedAt: now(),
      });
    }

    default:
      return post;
  }
}

async function finalizePublishing(
  store: Store,
  post: SocialPost,
  publishStatus: "scheduled" | "published" | "failed",
  now: () => string
): Promise<SocialPost> {
  if (publishStatus === "failed") {
    return store.update<SocialPost>("social_posts", post.id, {
      status: "publish_failed",
      rejectionReason: "Platform reported publish failure.",
      updatedAt: now(),
    });
  }
  return store.update<SocialPost>("social_posts", post.id, {
    status: "published",
    publishedAt: now(),
    updatedAt: now(),
  });
}

/**
 * Finds every actionable `social_posts` row for an account and advances
 * each one exactly one step. Per-post failure isolation: one row throwing
 * doesn't stop the rest of the batch, matching gsc-diagnostics.ts's
 * independent-attempt discipline.
 */
export async function runStateMachineTick(params: {
  accountId: string;
  store: Store;
  llm: LLM;
  platform: Platform;
  brandProfile?: SocialBrandProfile;
  spentTodayUsd: number;
  dailyCapUsd: number;
  model?: string;
  now?: () => string;
}): Promise<TickResult[]> {
  const results: TickResult[] = [];

  // Snapshot every actionable post BEFORE advancing any of them. Querying
  // per-status live (i.e. re-listing "briefed" after already having just
  // moved a post from "signal_gathered" into "briefed" earlier in this same
  // loop) would let one post cascade through several transitions inside a
  // single tick -- exactly the "decide what to do from scratch" behavior
  // the doc's state-machine reframing explicitly rejects. A snapshot
  // guarantees each post advances exactly one step per call, regardless of
  // what other posts in the same tick do.
  const actionablePosts = await params.store.list<SocialPost>("social_posts", {
    filters: [
      { field: "accountId", op: "eq", value: params.accountId },
      { field: "status", op: "in", value: ACTIONABLE_STATUSES },
    ],
  });

  const recentPosts = await params.store.list<SocialPost>("social_posts", {
    filters: [{ field: "accountId", op: "eq", value: params.accountId }],
    orderBy: { field: "createdAt", direction: "desc" },
    limit: 10,
  });

  for (const post of actionablePosts) {
    try {
      const updated = await advancePost({
        post,
        store: params.store,
        llm: params.llm,
        platform: params.platform,
        brandProfile: params.brandProfile,
        recentPosts,
        spentTodayUsd: params.spentTodayUsd,
        dailyCapUsd: params.dailyCapUsd,
        model: params.model,
        now: params.now,
      });
      results.push({ postId: post.id, fromStatus: post.status, toStatus: updated.status });
    } catch (error) {
      results.push({
        postId: post.id,
        fromStatus: post.status,
        toStatus: post.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function defaultIdGenerator(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
