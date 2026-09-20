import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../pipeline/test-support";
import { resolveAccountId } from "./resolve-account";

describe("resolveAccountId", () => {
  it("auto-resolves when exactly one social_accounts row exists", async () => {
    const store = new InMemoryStore();
    store.seed("social_accounts", [{ id: "acct-1", name: "phugialy.com" }]);

    const result = await resolveAccountId(store);
    expect(result).toEqual({ ok: true, accountId: "acct-1" });
  });

  it("errors, rather than guessing, when zero social_accounts rows exist", async () => {
    const store = new InMemoryStore();
    const result = await resolveAccountId(store);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no social_accounts rows/i);
  });

  it("errors, rather than guessing, when multiple social_accounts rows exist and no accountId was given", async () => {
    const store = new InMemoryStore();
    store.seed("social_accounts", [
      { id: "acct-1", name: "A" },
      { id: "acct-2", name: "B" },
    ]);

    const result = await resolveAccountId(store);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/explicit accountId/i);
  });

  it("uses an explicit accountId directly when it refers to a real row, even with other accounts present", async () => {
    const store = new InMemoryStore();
    store.seed("social_accounts", [
      { id: "acct-1", name: "A" },
      { id: "acct-2", name: "B" },
    ]);

    const result = await resolveAccountId(store, "acct-2");
    expect(result).toEqual({ ok: true, accountId: "acct-2" });
  });

  it("errors when an explicit accountId doesn't match any row", async () => {
    const store = new InMemoryStore();
    store.seed("social_accounts", [{ id: "acct-1", name: "A" }]);

    const result = await resolveAccountId(store, "nonexistent");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no social_accounts row with id/i);
  });
});
