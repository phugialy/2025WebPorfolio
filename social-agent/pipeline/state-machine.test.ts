import { describe, expect, it } from "vitest";
import { advancePost, createPostsForPlatforms, runStateMachineTick } from "./state-machine";
import { createStubPlatform } from "../adapters/stub-platform";
import { InMemoryStore, createScriptedLLM } from "./test-support";
import type { Query, Store } from "../ports";
import type { SocialPost, SocialSignal } from "./types";

function seedOneSignal(store: InMemoryStore, accountId: string) {
  store.seed<SocialSignal>("social_signals", [
    { id: "sig-1", accountId, source: "rss", keyword: "great news", score: 5, createdAt: "2026-09-19T00:00:00Z" },
  ]);
}

/** Wraps a real InMemoryStore and throws update() for one specific row id, to test per-post failure isolation in runStateMachineTick. */
class FlakyStore implements Store {
  constructor(private readonly inner: InMemoryStore, private readonly failOnUpdateId = "bad") {}
  get<T>(collection: string, id: string) {
    return this.inner.get<T>(collection, id);
  }
  list<T>(collection: string, query: Query) {
    return this.inner.list<T>(collection, query);
  }
  insert<T>(collection: string, row: T) {
    return this.inner.insert<T>(collection, row);
  }
  update<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
    if (id === this.failOnUpdateId) throw new Error("simulated per-row failure");
    return this.inner.update<T>(collection, id, patch);
  }
}

describe("createPostsForPlatforms", () => {
  it("creates one row per platform in signal_gathered status", async () => {
    const store = new InMemoryStore();
    const posts = await createPostsForPlatforms({ accountId: "acct-1", store, platforms: ["instagram", "x"] });
    expect(posts).toHaveLength(2);
    expect(posts.every((p) => p.status === "signal_gathered")).toBe(true);
    expect(posts.every((p) => p.revisionCount === 0)).toBe(true);
  });
});

describe("advancePost -- single-step transitions", () => {
  it("signal_gathered -> briefed attaches a brief", async () => {
    const store = new InMemoryStore();
    seedOneSignal(store, "acct-1");
    const [post] = await createPostsForPlatforms({ accountId: "acct-1", store, platforms: ["linkedin"] });
    const llm = createScriptedLLM([{ topic: "great news", angle: "a", keyPoints: ["x"], constraints: [], sourceSignalIds: ["sig-1"] }]);

    const updated = await advancePost({
      post,
      store,
      llm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    expect(updated.status).toBe("briefed");
    expect(updated.brief?.topic).toBe("great news");
  });

  it("briefed -> drafted on a usable Writer draft, briefed -> rejected on an unusable one", async () => {
    const store = new InMemoryStore();
    const briefedPost: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "x",
      status: "briefed",
      brief: { topic: "t", angle: "a", keyPoints: [], constraints: [], sourceSignalIds: [] },
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [briefedPost]);

    const goodLlm = createScriptedLLM([{ text: "Ship it.", hashtags: [], disclosurePresent: false }]);
    const goodResult = await advancePost({
      post: briefedPost,
      store,
      llm: goodLlm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });
    expect(goodResult.status).toBe("drafted");
    expect(goodResult.draftCopy).toBe("Ship it.");

    const badLlm = createScriptedLLM(["not json"]);
    const badResult = await advancePost({
      post: { ...briefedPost, id: "p2" },
      store: (() => {
        const s = new InMemoryStore();
        s.seed<SocialPost>("social_posts", [{ ...briefedPost, id: "p2" }]);
        return s;
      })(),
      llm: badLlm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });
    expect(badResult.status).toBe("rejected");
  });

  it("drafted -> guardrail_pending is a pure status flip with no LLM call", async () => {
    const store = new InMemoryStore();
    const draftedPost: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "facebook",
      status: "drafted",
      draftCopy: "hello",
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [draftedPost]);
    const llm = createScriptedLLM([]);

    const updated = await advancePost({
      post: draftedPost,
      store,
      llm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    expect(updated.status).toBe("guardrail_pending");
    expect(llm.calls.length).toBe(0);
  });

  it("guardrail_pending stays guardrail_pending (awaiting human review) on a clean guardrail publish verdict, with the verdict and finalCopy attached", async () => {
    const store = new InMemoryStore();
    const pending: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "linkedin",
      status: "guardrail_pending",
      draftCopy: "We shipped a new feature today.",
      draftHashtags: [],
      draftDisclosurePresent: false,
      draftReadyForReview: true,
      brief: { topic: "t", angle: "a", keyPoints: [], constraints: [], sourceSignalIds: [] },
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [pending]);
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

    const updated = await advancePost({
      post: pending,
      store,
      llm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    // Bug fix: a "publish" verdict must NOT auto-advance to "approved" --
    // that would let the very next tick's "approved" case call
    // platform.createPost with zero human review. It stays at
    // "guardrail_pending" with the verdict/finalCopy attached so the admin
    // queue (which filters on status === "guardrail_pending") shows it.
    expect(updated.status).toBe("guardrail_pending");
    expect(updated.guardrailVerdict?.decision).toBe("publish");
    expect(updated.finalCopy).toBe("We shipped a new feature today.");
  });

  it("guardrail_pending is a no-op (and does not re-call the LLM) on a second tick once already reviewed with a publish verdict", async () => {
    const store = new InMemoryStore();
    const alreadyReviewed: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "linkedin",
      status: "guardrail_pending",
      draftCopy: "We shipped a new feature today.",
      draftHashtags: [],
      draftDisclosurePresent: false,
      draftReadyForReview: true,
      finalCopy: "We shipped a new feature today.",
      guardrailVerdict: {
        decision: "publish",
        platform: "linkedin",
        checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
        disclosureRequired: false,
        disclosurePresent: false,
        sensitiveTopicFlags: [],
        reasoning: "clean",
        budgetOk: true,
        repetitionRisk: 1,
        escalate: false,
      },
      brief: { topic: "t", angle: "a", keyPoints: [], constraints: [], sourceSignalIds: [] },
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [alreadyReviewed]);
    const llm = createScriptedLLM([]);

    const updated = await advancePost({
      post: alreadyReviewed,
      store,
      llm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    expect(updated.status).toBe("guardrail_pending");
    expect(updated).toEqual(alreadyReviewed);
    expect(llm.calls.length).toBe(0);
  });

  it("guardrail_pending -> rejected when required disclosure is missing, regardless of scores", async () => {
    const store = new InMemoryStore();
    const pending: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "instagram",
      status: "guardrail_pending",
      draftCopy: "Check out this affiliate link for our favorite gear!",
      draftHashtags: [],
      draftDisclosurePresent: false,
      draftReadyForReview: true,
      brief: { topic: "affiliate gear roundup", angle: "a", keyPoints: [], constraints: [], sourceSignalIds: [] },
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [pending]);
    const llm = createScriptedLLM([
      {
        checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
        disclosurePresent: false,
        sensitiveTopicFlags: [],
        reasoning: "no disclosure text found",
        repetitionRisk: 1,
        escalate: false,
      },
    ]);

    const updated = await advancePost({
      post: pending,
      store,
      llm,
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    expect(updated.status).toBe("rejected");
  });

  it("guardrail_pending -> briefed (revise loop) with an incremented revisionCount, then rejected once the cap is exceeded", async () => {
    const makePending = (revisionCount: number): SocialPost => ({
      id: "p1",
      accountId: "acct-1",
      platform: "x",
      status: "guardrail_pending",
      draftCopy: "meh copy",
      draftHashtags: [],
      draftDisclosurePresent: false,
      draftReadyForReview: true,
      brief: { topic: "t", angle: "a", keyPoints: [], constraints: [], sourceSignalIds: [] },
      revisionCount,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    });

    const reviseVerdict = {
      checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 3, spamPatternRisk: 5 },
      disclosurePresent: false,
      sensitiveTopicFlags: [],
      reasoning: "tone is a bit off-brand",
      repetitionRisk: 1,
      escalate: false,
    };

    // First revise: revisionCount 0 -> 1, back to "briefed".
    const store1 = new InMemoryStore();
    const post0 = makePending(0);
    store1.seed<SocialPost>("social_posts", [post0]);
    const updated1 = await advancePost({
      post: post0,
      store: store1,
      llm: createScriptedLLM([reviseVerdict]),
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });
    expect(updated1.status).toBe("briefed");
    expect(updated1.revisionCount).toBe(1);

    // At the cap (MAX_REVISION_PASSES = 2): another revise verdict should reject instead of looping forever.
    const store2 = new InMemoryStore();
    const postAtCap = makePending(2);
    store2.seed<SocialPost>("social_posts", [postAtCap]);
    const updated2 = await advancePost({
      post: postAtCap,
      store: store2,
      llm: createScriptedLLM([reviseVerdict]),
      platform: createStubPlatform(),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });
    expect(updated2.status).toBe("rejected");
  });

  it("approved -> publishing -> published via the stub Platform, which logs instead of calling a real API", async () => {
    const store = new InMemoryStore();
    const calls: Array<{ message: string; meta?: Record<string, unknown> }> = [];
    const approved: SocialPost = {
      id: "p1",
      accountId: "acct-1",
      platform: "linkedin",
      status: "approved",
      finalCopy: "final copy ready to go",
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    store.seed<SocialPost>("social_posts", [approved]);

    const updated = await advancePost({
      post: approved,
      store,
      llm: createScriptedLLM([]),
      platform: createStubPlatform({ logger: (message, meta) => calls.push({ message, meta }) }),
      recentPosts: [],
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    expect(updated.status).toBe("published");
    expect(updated.platformPostId).toMatch(/^stub-linkedin-/);
    expect(calls.some((c) => c.message.includes("createPost"))).toBe(true);
  });
});

describe("runStateMachineTick -- full loop, per-account", () => {
  it("advances a fresh post from signal_gathered all the way to published across repeated ticks", async () => {
    const store = new InMemoryStore();
    seedOneSignal(store, "acct-1");
    await createPostsForPlatforms({ accountId: "acct-1", store, platforms: ["x"] });

    const llm = createScriptedLLM([
      // Strategist
      { topic: "great news", angle: "a", keyPoints: ["x"], constraints: [], sourceSignalIds: ["sig-1"] },
      // Writer
      { text: "Great news, everyone.", hashtags: [], disclosurePresent: false },
      // Guardrail
      {
        checks: { factualAccuracy: 5, platformPolicyFit: 5, brandVoiceFit: 5, spamPatternRisk: 5 },
        disclosurePresent: false,
        sensitiveTopicFlags: [],
        reasoning: "clean",
        repetitionRisk: 1,
        escalate: false,
      },
    ]);
    const platform = createStubPlatform({ logger: () => {} });

    // signal_gathered -> briefed
    await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });
    // briefed -> drafted
    await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });
    // drafted -> guardrail_pending
    await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });
    // guardrail_pending -> stays guardrail_pending, now carrying a "publish"
    // verdict -- per the graduated-autonomy fix, this does NOT auto-advance.
    const guardrailResults = await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });
    expect(guardrailResults.some((r) => r.toStatus === "guardrail_pending")).toBe(true);

    const [reviewedPost] = await store.list<SocialPost>("social_posts", { filters: [{ field: "accountId", op: "eq", value: "acct-1" }] });
    expect(reviewedPost.status).toBe("guardrail_pending");
    expect(reviewedPost.guardrailVerdict?.decision).toBe("publish");

    // Another tick with the LLM script exhausted proves this row is a true
    // no-op while awaiting human review, not silently re-reviewed.
    const noopResults = await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });
    expect(noopResults.find((r) => r.postId === reviewedPost.id)?.toStatus).toBe("guardrail_pending");

    // Simulate the human approval PATCH (app/api/admin/social/queue/[id]/route.ts's
    // `approve` action) -- the only thing allowed to move this row to
    // "approved" now that the guardrail step itself no longer does.
    await store.update<SocialPost>("social_posts", reviewedPost.id, { status: "approved" });

    // approved -> published
    const finalResults = await runStateMachineTick({ accountId: "acct-1", store, llm, platform, spentTodayUsd: 0, dailyCapUsd: 1 });

    const [finalPost] = await store.list<SocialPost>("social_posts", { filters: [{ field: "accountId", op: "eq", value: "acct-1" }] });
    expect(finalPost.status).toBe("published");
    expect(finalResults.some((r) => r.toStatus === "published")).toBe(true);
  });

  it("isolates one post's failure so the rest of the batch still advances", async () => {
    const store = new InMemoryStore();
    const good: SocialPost = {
      id: "good",
      accountId: "acct-1",
      platform: "facebook",
      status: "drafted",
      draftCopy: "fine",
      revisionCount: 0,
      pipelineVersion: "test",
      createdAt: "now",
      updatedAt: "now",
    };
    const bad: SocialPost = { ...good, id: "bad", platform: "x" };
    store.seed<SocialPost>("social_posts", [good, bad]);

    const results = await runStateMachineTick({
      accountId: "acct-1",
      store: new FlakyStore(store),
      llm: createScriptedLLM([]),
      platform: createStubPlatform({ logger: () => {} }),
      spentTodayUsd: 0,
      dailyCapUsd: 1,
    });

    const goodResult = results.find((r) => r.postId === "good");
    const badResult = results.find((r) => r.postId === "bad");
    expect(goodResult?.toStatus).toBe("guardrail_pending");
    expect(badResult?.error).toContain("simulated per-row failure");
  });
});
