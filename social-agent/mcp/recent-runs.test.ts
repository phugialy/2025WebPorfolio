import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../pipeline/test-support";
import { getRecentRuns } from "./recent-runs";

describe("getRecentRuns", () => {
  it("returns only the given account's runs, newest first", async () => {
    const store = new InMemoryStore();
    store.seed("social_runs", [
      { id: "run-1", accountId: "acct-1", job: "signal-scan", ok: true, summary: null, createdAt: "2026-01-01T00:00:00Z" },
      { id: "run-2", accountId: "acct-1", job: "writer", ok: true, summary: null, createdAt: "2026-01-03T00:00:00Z" },
      { id: "run-other", accountId: "acct-OTHER", job: "writer", ok: true, summary: null, createdAt: "2026-01-04T00:00:00Z" },
      { id: "run-3", accountId: "acct-1", job: "guardrail", ok: false, summary: { error: "boom" }, createdAt: "2026-01-02T00:00:00Z" },
    ]);

    const runs = await getRecentRuns(store, "acct-1");
    expect(runs.map((r) => r.id)).toEqual(["run-2", "run-3", "run-1"]);
    expect(runs.every((r) => r.accountId === "acct-1")).toBe(true);
  });

  it("respects the limit parameter", async () => {
    const store = new InMemoryStore();
    store.seed(
      "social_runs",
      Array.from({ length: 5 }, (_, i) => ({
        id: `run-${i}`,
        accountId: "acct-1",
        job: "tick",
        ok: true,
        summary: null,
        createdAt: `2026-01-0${i + 1}T00:00:00Z`,
      }))
    );

    const runs = await getRecentRuns(store, "acct-1", 2);
    expect(runs).toHaveLength(2);
  });

  it("defaults to a limit of 20 when none is given", async () => {
    const store = new InMemoryStore();
    store.seed(
      "social_runs",
      Array.from({ length: 30 }, (_, i) => ({
        id: `run-${i}`,
        accountId: "acct-1",
        job: "tick",
        ok: true,
        summary: null,
        createdAt: new Date(2026, 0, i + 1).toISOString(),
      }))
    );

    const runs = await getRecentRuns(store, "acct-1");
    expect(runs).toHaveLength(20);
  });
});
