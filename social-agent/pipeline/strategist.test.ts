import { describe, expect, it } from "vitest";
import { buildContentBrief } from "./strategist";
import { InMemoryStore, createScriptedLLM } from "./test-support";
import type { SocialPost, SocialSignal } from "./types";

function seedSignals(store: InMemoryStore, accountId: string) {
  store.seed<SocialSignal>("social_signals", [
    { id: "s1", accountId, source: "rss", keyword: "topic strong", score: 5, createdAt: "2026-09-19T00:00:00Z" },
    { id: "s2", accountId, source: "operator", keyword: "operator topic", score: 5, createdAt: "2026-09-19T00:00:00Z" },
    { id: "s3", accountId, source: "gsc", keyword: "topic weak", score: 2, createdAt: "2026-09-18T00:00:00Z" },
  ]);
}

describe("buildContentBrief", () => {
  it("returns a deterministic no-content fallback when there are no signals at all", async () => {
    const store = new InMemoryStore();
    const llm = createScriptedLLM([]);
    const brief = await buildContentBrief({ accountId: "acct-1", store, llm });
    expect(brief.sourceSignalIds).toEqual([]);
    expect(llm.calls.length).toBe(0);
  });

  it("folds recent rejection reasons into constraints", async () => {
    const store = new InMemoryStore();
    seedSignals(store, "acct-1");
    store.seed<SocialPost>("social_posts", [
      {
        id: "p1",
        accountId: "acct-1",
        platform: "linkedin",
        status: "rejected",
        rejectionReason: "avoid pricing claims",
        revisionCount: 0,
        pipelineVersion: "test",
        createdAt: "2026-09-19T00:00:00Z",
        updatedAt: "2026-09-19T00:00:00Z",
      },
    ]);

    const llm = createScriptedLLM([
      {
        topic: "topic strong",
        angle: "practical angle",
        keyPoints: ["a", "b"],
        constraints: ["avoid pricing claims"],
        sourceSignalIds: ["s1"],
      },
    ]);

    const brief = await buildContentBrief({ accountId: "acct-1", store, llm });
    expect(brief.constraints).toContain("avoid pricing claims");
  });

  it("keeps rejection-derived constraints even when the model's own response omits them (partial parse)", async () => {
    const store = new InMemoryStore();
    seedSignals(store, "acct-1");
    store.seed<SocialPost>("social_posts", [
      {
        id: "p1",
        accountId: "acct-1",
        platform: "x",
        status: "rejected",
        rejectionReason: "no health claims",
        revisionCount: 0,
        pipelineVersion: "test",
        createdAt: "2026-09-19T00:00:00Z",
        updatedAt: "2026-09-19T00:00:00Z",
      },
    ]);

    // Model response is valid JSON but omits "constraints" entirely.
    const llm = createScriptedLLM([{ topic: "t", angle: "a", keyPoints: ["x"], sourceSignalIds: ["s1"] }]);

    const brief = await buildContentBrief({ accountId: "acct-1", store, llm });
    expect(brief.constraints).toContain("no health claims");
  });

  it("falls back to a signal-derived brief on a parse failure, never inventing content", async () => {
    const store = new InMemoryStore();
    seedSignals(store, "acct-1");
    const llm = createScriptedLLM(["totally not json"]);

    const brief = await buildContentBrief({ accountId: "acct-1", store, llm });
    expect(brief.topic).toBe("topic strong"); // highest-scored signal, deterministic
    expect(brief.sourceSignalIds).toContain("s1");
  });

  it("reads an operator-injected signal exactly like any other signal (no special-casing)", async () => {
    const store = new InMemoryStore();
    seedSignals(store, "acct-1");
    const llm = createScriptedLLM([
      { topic: "operator topic", angle: "a", keyPoints: ["x"], constraints: [], sourceSignalIds: ["s2"] },
    ]);

    const brief = await buildContentBrief({ accountId: "acct-1", store, llm });
    expect(brief.topic).toBe("operator topic");
  });
});
