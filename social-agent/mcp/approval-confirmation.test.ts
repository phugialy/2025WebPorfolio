import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../pipeline/test-support";
import {
  APPROVAL_CONFIRMATION_CODE_LENGTH,
  APPROVAL_CONFIRMATION_CODE_TTL_MINUTES,
  generateConfirmationCode,
  resolveApprovalConfirmation,
} from "./approval-confirmation";

function seedPost(store: InMemoryStore, overrides: Record<string, unknown> = {}) {
  store.seed("social_posts", [
    {
      id: "post-1",
      status: "guardrail_pending",
      approvalConfirmationCode: null,
      approvalConfirmationExpiresAt: null,
      ...overrides,
    },
  ]);
}

describe("generateConfirmationCode", () => {
  it("returns a zero-padded numeric string of the configured length", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateConfirmationCode();
      expect(code).toMatch(/^\d+$/);
      expect(code).toHaveLength(APPROVAL_CONFIRMATION_CODE_LENGTH);
    }
  });
});

describe("resolveApprovalConfirmation", () => {
  it("fails with a clear error when the post doesn't exist", async () => {
    const store = new InMemoryStore();
    const result = await resolveApprovalConfirmation(store, "missing", undefined);
    expect(result).toEqual({ ok: false, error: 'No social_posts row with id "missing".' });
  });

  it("first call (no confirmationCode): issues a fresh code and expiry, does not confirm", async () => {
    const store = new InMemoryStore();
    seedPost(store);
    const now = new Date("2026-09-20T00:00:00.000Z");

    const result = await resolveApprovalConfirmation(store, "post-1", undefined, () => now);

    expect(result.ok).toBe(true);
    if (!result.ok || result.confirmed) throw new Error("expected confirmed: false");
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiryMinutes).toBe(APPROVAL_CONFIRMATION_CODE_TTL_MINUTES);
    expect(result.expiresAt).toBe(new Date(now.getTime() + APPROVAL_CONFIRMATION_CODE_TTL_MINUTES * 60_000).toISOString());

    // Persisted against the row, and the post's own status/other fields are untouched.
    const [row] = store.dump<Record<string, unknown>>("social_posts");
    expect(row.approvalConfirmationCode).toBe(result.code);
    expect(row.approvalConfirmationExpiresAt).toBe(result.expiresAt);
    expect(row.status).toBe("guardrail_pending");
  });

  it("second call with the matching, unexpired code: confirms and clears the stored code", async () => {
    const store = new InMemoryStore();
    const now = new Date("2026-09-20T00:00:00.000Z");
    seedPost(store, {
      approvalConfirmationCode: "482913",
      approvalConfirmationExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
    });

    const result = await resolveApprovalConfirmation(store, "post-1", "482913", () => now);

    expect(result).toEqual({ ok: true, confirmed: true });
    const [row] = store.dump<Record<string, unknown>>("social_posts");
    expect(row.approvalConfirmationCode).toBeNull();
    expect(row.approvalConfirmationExpiresAt).toBeNull();
  });

  it("expired code: fails closed, issuing a fresh code exactly like a first call", async () => {
    const store = new InMemoryStore();
    const now = new Date("2026-09-20T00:10:00.000Z");
    seedPost(store, {
      approvalConfirmationCode: "111111",
      approvalConfirmationExpiresAt: new Date(now.getTime() - 1_000).toISOString(), // expired 1s ago
    });

    const result = await resolveApprovalConfirmation(store, "post-1", "111111", () => now);

    expect(result.ok).toBe(true);
    if (!result.ok || result.confirmed) throw new Error("expected confirmed: false");
    expect(result.code).not.toBe("111111"); // fresh code issued, not the stale one
    const [row] = store.dump<Record<string, unknown>>("social_posts");
    expect(row.approvalConfirmationCode).toBe(result.code);
  });

  it("mismatched code: fails closed, issuing a fresh code, without revealing that a code existed", async () => {
    const store = new InMemoryStore();
    const now = new Date("2026-09-20T00:00:00.000Z");
    seedPost(store, {
      approvalConfirmationCode: "111111",
      approvalConfirmationExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
    });

    const result = await resolveApprovalConfirmation(store, "post-1", "999999", () => now);

    expect(result.ok).toBe(true);
    if (!result.ok || result.confirmed) throw new Error("expected confirmed: false");
    // Same shape as a first-ever call -- nothing distinguishes "wrong code" from "no code yet".
    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("expiresAt");
    expect(result.code).not.toBe("111111");
    expect(result.code).not.toBe("999999");
  });

  it("a successful confirmation cannot be replayed with the same code", async () => {
    const store = new InMemoryStore();
    const now = new Date("2026-09-20T00:00:00.000Z");
    seedPost(store, {
      approvalConfirmationCode: "482913",
      approvalConfirmationExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
    });

    const first = await resolveApprovalConfirmation(store, "post-1", "482913", () => now);
    expect(first).toEqual({ ok: true, confirmed: true });

    const replay = await resolveApprovalConfirmation(store, "post-1", "482913", () => now);
    expect(replay.ok).toBe(true);
    if (!replay.ok || replay.confirmed) throw new Error("expected the replay to fail closed, not confirm again");
    expect(replay.code).not.toBe("482913");
  });
});
