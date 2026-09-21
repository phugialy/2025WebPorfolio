import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { InMemoryStore } from "@/social-agent/pipeline/test-support";

// Mocked Store/Supabase, no live DB -- per the task's explicit instruction.
// `createSupabaseStore()` is replaced with a fresh InMemoryStore per test
// (the real Store port implementation, just backed by an in-memory map
// instead of Supabase), and `requireAdminSession` is stubbed so these tests
// exercise this route's actual GET/PATCH logic without a real next-auth
// session or a real database.
//
// `holder` is a mutable box (not a plain destructured `store` const) so
// `beforeEach` can swap in a brand-new InMemoryStore per test -- the mock
// factory below closes over `holder`, not over a snapshotted store
// instance, so reassigning `holder.store` is visible to route.ts's own
// `createSupabaseStore()` call on the very next request.
// `store` starts as `undefined` here -- `vi.hoisted`'s callback runs before
// static imports are bound (confirmed directly: referencing the imported
// `InMemoryStore` inside it throws "Cannot access before initialization"),
// so the actual instance is assigned in the top-level `beforeEach` below,
// which runs after imports have resolved.
const holder = vi.hoisted(() => ({
  store: undefined as unknown as InMemoryStore,
  requireAdminSessionMock: vi.fn(),
}));

vi.mock("@/app/social-agent-adapters/store", () => ({
  createSupabaseStore: () => holder.store,
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdminSession: holder.requireAdminSessionMock,
}));

// Imported AFTER the mocks above are registered, per vitest's own
// documented vi.mock hoisting contract.
const { GET, PATCH } = await import("./route");

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/social/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  holder.store = new InMemoryStore();
  holder.requireAdminSessionMock.mockReset();
  holder.requireAdminSessionMock.mockResolvedValue({ ok: true, session: { user: { email: "phu.lyg@gmail.com" } } });
});

describe("GET /api/admin/social/settings", () => {
  it("returns 401 when there is no admin session", async () => {
    holder.requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns found: false with an accountError when no social_accounts row exists yet", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.accountError).toMatch(/no social_accounts rows/i);
  });
});

describe("GET/PATCH round-trip against a seeded account", () => {
  const accountId = "acct-1";

  beforeEach(() => {
    holder.store.seed("social_accounts", [{ id: accountId, name: "phugialy.com" }]);
  });

  it("GET returns found: false when the account has no brand-profile row yet", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.found).toBe(false);
  });

  it("PATCH writes only the fields provided, via the shared updateBrandProfile function", async () => {
    const res = await PATCH(
      patchRequest({ voice_description: "warm, direct", tone_guidelines: ["no jargon", "no hype"] })
    );
    const body = await res.json();

    expect(body.found).toBe(true);
    expect(body.voice_description).toBe("warm, direct");
    expect(body.tone_guidelines).toEqual(["no jargon", "no hype"]);
    expect(body.banned_topics).toBeUndefined();
    expect(body.disclosure_template).toBeUndefined();

    expect(holder.store.dump("social_brand_profile")).toHaveLength(1);
  });

  it("PATCH updates an existing row in place rather than inserting a duplicate", async () => {
    await PATCH(patchRequest({ voice_description: "first pass" }));
    await PATCH(patchRequest({ banned_topics: ["politics"] }));

    const rows = holder.store.dump<{ voice: string; bannedTopics: string[] }>("social_brand_profile");
    expect(rows).toHaveLength(1);
    expect(rows[0].voice).toBe("first pass");
    expect(rows[0].bannedTopics).toEqual(["politics"]);
  });

  it("PATCH ignores any guardrail-threshold-shaped keys in the request body -- there is no field or code path for them", async () => {
    const res = await PATCH(
      patchRequest({
        voice_description: "warm",
        maxRevisionPasses: 99,
        dailyOpenRouterSpendCapUsd: 9999,
        minSignalScoreToDraft: 0,
      })
    );
    const body = await res.json();
    expect(body.voice_description).toBe("warm");

    const rows = holder.store.dump<Record<string, unknown>>("social_brand_profile");
    expect(rows[0]).not.toHaveProperty("maxRevisionPasses");
    expect(rows[0]).not.toHaveProperty("dailyOpenRouterSpendCapUsd");
    expect(rows[0]).not.toHaveProperty("minSignalScoreToDraft");
  });

  it("PATCH returns 401 when there is no admin session, without writing anything", async () => {
    holder.requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const res = await PATCH(patchRequest({ voice_description: "should not be written" }));
    expect(res.status).toBe(401);
    expect(holder.store.dump("social_brand_profile")).toHaveLength(0);
  });
});
