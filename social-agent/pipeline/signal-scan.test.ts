import { describe, expect, it } from "vitest";
import { injectOperatorSignal, scanSignals, scoreSignalCandidate } from "./signal-scan";
import { InMemoryStore, createScriptedLLM } from "./test-support";
import type { SocialSignal } from "./types";

describe("scoreSignalCandidate", () => {
  it("parses a valid model response", async () => {
    const llm = createScriptedLLM([{ score: 4, relevant: true, reasoning: "strong current hook" }]);
    const verdict = await scoreSignalCandidate(llm, { source: "rss", keyword: "topic a" });
    expect(verdict).toEqual({ score: 4, relevant: true, reasoning: "strong current hook" });
  });

  it("defaults to low relevance on a parse failure rather than guessing", async () => {
    const llm = createScriptedLLM(["<<not json>>"]);
    const verdict = await scoreSignalCandidate(llm, { source: "gsc", keyword: "topic b" });
    expect(verdict.score).toBe(1);
    expect(verdict.relevant).toBe(false);
  });

  it("clamps an out-of-range score into 1-5", async () => {
    const llm = createScriptedLLM([{ score: 99, relevant: true }]);
    const verdict = await scoreSignalCandidate(llm, { source: "rss", keyword: "topic c" });
    expect(verdict.score).toBe(5);
  });
});

describe("scanSignals", () => {
  it("writes one social_signals row per candidate", async () => {
    const store = new InMemoryStore();
    const llm = createScriptedLLM([
      { score: 4, relevant: true, reasoning: "a" },
      { score: 2, relevant: false, reasoning: "b" },
    ]);

    const { written, failed } = await scanSignals({
      accountId: "acct-1",
      store,
      llm,
      candidates: [
        { source: "rss", keyword: "kw-1" },
        { source: "gsc", keyword: "kw-2" },
      ],
      idGenerator: (() => {
        let n = 0;
        return () => `sig-${++n}`;
      })(),
    });

    expect(failed).toBe(0);
    expect(written).toHaveLength(2);
    expect(store.dump<SocialSignal>("social_signals")).toHaveLength(2);
    expect(written[0]).toMatchObject({ accountId: "acct-1", source: "rss", keyword: "kw-1", score: 4 });
  });

  it("isolates one candidate's failure without losing the others", async () => {
    const store = new InMemoryStore();
    const failingLlm = {
      calls: 0,
      async generateText() {
        failingLlm.calls += 1;
        if (failingLlm.calls === 1) throw new Error("boom");
        return { content: JSON.stringify({ score: 5, relevant: true }) };
      },
    };

    const { written, failed } = await scanSignals({
      accountId: "acct-1",
      store,
      llm: failingLlm,
      candidates: [
        { source: "rss", keyword: "bad" },
        { source: "rss", keyword: "good" },
      ],
    });

    expect(failed).toBe(1);
    expect(written).toHaveLength(1);
    expect(written[0].keyword).toBe("good");
  });
});

describe("injectOperatorSignal", () => {
  it("writes a source: operator row without calling the LLM, defaulting to a high score", async () => {
    const store = new InMemoryStore();
    const row = await injectOperatorSignal({
      accountId: "acct-1",
      store,
      keyword: "operator knows this is worth posting",
      note: "saw this in person",
    });

    expect(row.source).toBe("operator");
    expect(row.score).toBe(5);
    expect(store.dump<SocialSignal>("social_signals")).toHaveLength(1);
  });

  it("reads back exactly like any other signal via Store.list", async () => {
    const store = new InMemoryStore();
    await injectOperatorSignal({ accountId: "acct-1", store, keyword: "operator topic" });
    store.seed<SocialSignal>("social_signals", [
      { id: "rss-1", accountId: "acct-1", source: "rss", keyword: "rss topic", score: 3, createdAt: new Date().toISOString() },
    ]);

    const all = await store.list<SocialSignal>("social_signals", { filters: [{ field: "accountId", op: "eq", value: "acct-1" }] });
    expect(all.map((s) => s.source).sort()).toEqual(["operator", "rss"]);
  });
});
