import { describe, expect, it, vi } from "vitest";
import { applyQueueAction, listGuardrailPendingQueue } from "./queue-shared";

// A minimal fake of the one chained-query shape both functions in
// queue-shared.ts actually use (.from().select()....eq()....order() /
// .from().update().eq()), resolving to whatever {data, error} (or {error})
// the test configures -- no live Supabase client anywhere in this file, per
// the task's "mocked dependencies, not a live database" instruction. Every
// chain method returns `this` so calls compose in any order the real code
// happens to use them in, and the object is directly awaitable (a
// thenable), matching how the real supabase-js query builder itself is
// awaited without an explicit terminal method.
// Real supabase-js errors (PostgrestError) are Error instances with a `code`
// property -- constructed the same way here so the `error instanceof Error`
// check in queue-shared.ts's catch blocks (same convention the admin route
// it was extracted from already used) behaves the same as it would against
// a real client.
function postgrestError(message: string, code?: string): Error & { code?: string } {
  return Object.assign(new Error(message), { code });
}

function fakeSupabase(result: { data?: unknown; error?: (Error & { code?: string }) | null }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    from: (...args: unknown[]) => (calls.push({ method: "from", args }), builder),
    select: (...args: unknown[]) => (calls.push({ method: "select", args }), builder),
    update: (...args: unknown[]) => (calls.push({ method: "update", args }), builder),
    eq: (...args: unknown[]) => (calls.push({ method: "eq", args }), builder),
    order: (...args: unknown[]) => (calls.push({ method: "order", args }), builder),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return { client: builder, calls };
}

describe("listGuardrailPendingQueue", () => {
  it("returns the queue rows on success", async () => {
    const posts = [{ id: "p1", account_id: "a1", platform: "linkedin", status: "guardrail_pending" }];
    const { client, calls } = fakeSupabase({ data: posts, error: null });

    const result = await listGuardrailPendingQueue(client);

    expect(result).toEqual({ ok: true, posts });
    expect(calls.find((c) => c.method === "eq")?.args).toEqual(["status", "guardrail_pending"]);
    expect(calls.find((c) => c.method === "order")?.args).toEqual(["created_at", { ascending: true }]);
  });

  it("treats a missing-relation error (42P01) as an empty, migration-pending queue rather than a failure", async () => {
    const { client } = fakeSupabase({ error: postgrestError("relation does not exist", "42P01") });

    const result = await listGuardrailPendingQueue(client);
    expect(result).toEqual({ ok: true, posts: [], migrationPending: true });
  });

  it("surfaces any other database error as a failure", async () => {
    const { client } = fakeSupabase({ error: postgrestError("unique violation", "23505") });

    const result = await listGuardrailPendingQueue(client);
    expect(result).toEqual({ ok: false, error: "unique violation", status: 500 });
  });

  it("returns a config error when no Supabase client is available, without ever touching the client", async () => {
    const result = await listGuardrailPendingQueue(null);
    expect(result).toEqual({ ok: false, error: "Supabase admin client is not configured.", status: 500 });
  });
});

describe("applyQueueAction", () => {
  it("approve: sets status=approved and approved_by=actor, and includes final_text only when finalCopy is given", async () => {
    const { client, calls } = fakeSupabase({ error: null });

    const result = await applyQueueAction("post-1", { action: "approve", finalCopy: "final text" }, "hippo-assist", client);

    expect(result).toEqual({ ok: true });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args[0]).toEqual({ status: "approved", approved_by: "hippo-assist", final_text: "final text" });
    expect(calls.find((c) => c.method === "eq")?.args).toEqual(["id", "post-1"]);
  });

  it("approve: omits final_text when no finalCopy is given", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    await applyQueueAction("post-1", { action: "approve" }, "hippo-assist", client);
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args[0]).toEqual({ status: "approved", approved_by: "hippo-assist" });
  });

  it("reject: sets status=rejected, rejection_reason, and approved_by=actor", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    await applyQueueAction("post-1", { action: "reject", rejectionReason: "off brand" }, "hippo-assist", client);
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args[0]).toEqual({ status: "rejected", rejection_reason: "off brand", approved_by: "hippo-assist" });
  });

  it("edit: writes draft_text and does not touch status or approved_by", async () => {
    const { client, calls } = fakeSupabase({ error: null });
    await applyQueueAction("post-1", { action: "edit", draftCopy: "new draft" }, "hippo-assist", client);
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args[0]).toEqual({ draft_text: "new draft" });
  });

  it("edit: rejects a missing/blank draftCopy without ever touching the client", async () => {
    const client = fakeSupabase({ error: null }).client;
    const spy = vi.spyOn(client, "update");

    const result = await applyQueueAction("post-1", { action: "edit", draftCopy: "   " }, "hippo-assist", client);

    expect(result).toEqual({ ok: false, error: "draftCopy is required for the edit action", status: 400 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces a database error from the update call as a failure", async () => {
    const { client } = fakeSupabase({ error: postgrestError("connection reset") });
    const result = await applyQueueAction("post-1", { action: "approve" }, "hippo-assist", client);
    expect(result).toEqual({ ok: false, error: "connection reset", status: 500 });
  });

  it("returns a config error when no Supabase client is available", async () => {
    const result = await applyQueueAction("post-1", { action: "approve" }, "hippo-assist", null);
    expect(result).toEqual({ ok: false, error: "Supabase admin client is not configured.", status: 500 });
  });
});
