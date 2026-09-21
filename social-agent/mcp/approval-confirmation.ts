// Two-step confirmation for the `approve_post` MCP tool
// (app/api/mcp/social/route.ts) -- see
// docs/decisions/mcp-approve-post-confirmation.md for the full design.
//
// This is defense-in-depth scoped ONLY to that one tool: the server no
// longer treats a single `approve_post` call as sufficient to trigger a
// real publish, independent of whatever consent gate the calling MCP
// client (Hippo-Assist) has on its own side. It does NOT touch
// queue-shared.ts's `applyQueueAction` or the browser admin UI's Approve
// action -- those remain a human clicking a button behind admin-session
// auth, already sufficient on its own.
//
// Portable: depends only on the Store port, per social-agent/README.md's
// boundary rule -- same discipline as every other file in this directory
// (resolve-account.ts, brand-profile.ts, recent-runs.ts).

import type { Store } from "../ports";

/**
 * How long an issued confirmation code stays valid. A named constant, not a
 * bare number, matching this project's established convention for
 * cost/threshold constants (DAILY_OPENROUTER_SPEND_CAP_USD in
 * social-agent/reliability/watchdog.ts, MAX_REVISION_PASSES in
 * social-agent/pipeline/guardrail.ts).
 */
export const APPROVAL_CONFIRMATION_CODE_TTL_MINUTES = 5;

/** Digit length of a generated confirmation code -- see generateConfirmationCode's own comment for why numeric/this length. */
export const APPROVAL_CONFIRMATION_CODE_LENGTH = 6;

/** `social_posts` fields this module reads/writes, as `Store` hands them back (camelCase) -- both translate mechanically to/from `approval_confirmation_code` / `approval_confirmation_expires_at` (verified against app/social-agent-adapters/store.ts's toSnakeCase/toCamelCase before writing this; no FIELD_ALIASES entry needed). */
export type ApprovalConfirmationFields = {
  id: string;
  approvalConfirmationCode: string | null;
  approvalConfirmationExpiresAt: string | null;
};

/**
 * A short, human-legible numeric code (e.g. "482913") -- readable in a chat
 * transcript the way "confirm with 482913" reads naturally, per the task's
 * own framing. The threat model here is an LLM calling `approve_post`
 * over-eagerly or by mistake without genuine upstream human confirmation,
 * not a remote attacker without API access brute-forcing a 6-digit space --
 * anyone able to call this tool at all already holds SOCIAL_MCP_API_KEY, a
 * separate, larger trust boundary. Uses Web Crypto when available (uniform,
 * not modulo-biased against a power-of-ten range) with a Math.random
 * fallback -- same "prefer crypto, degrade gracefully" shape
 * brand-profile.ts's defaultIdGenerator already uses in this codebase.
 */
export function generateConfirmationCode(): string {
  const max = 10 ** APPROVAL_CONFIRMATION_CODE_LENGTH;
  let n: number;

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    n = buf[0] % max;
  } else {
    n = Math.floor(Math.random() * max);
  }

  return n.toString().padStart(APPROVAL_CONFIRMATION_CODE_LENGTH, "0");
}

export type ApprovalConfirmationResult =
  | { ok: false; error: string }
  | { ok: true; confirmed: true }
  | {
      ok: true;
      confirmed: false;
      code: string;
      expiresAt: string;
      expiryMinutes: number;
    };

/**
 * Advances a post's approval-confirmation state by exactly one step, per
 * the flow in docs/decisions/mcp-approve-post-confirmation.md:
 *
 * - No `providedCode`, or one that doesn't match the stored code, or one
 *   whose stored expiry has passed: issues a fresh code, persists it with a
 *   new expiry, and returns `confirmed: false` -- the caller (route.ts)
 *   must NOT call applyQueueAction in this case. This branch is identical
 *   for "first call ever" and "wrong/stale code" on purpose -- fails
 *   closed, never reveals which case it was.
 * - `providedCode` exactly matches the stored code AND the stored expiry is
 *   still in the future: clears both columns (single-use -- can't be
 *   replayed) and returns `confirmed: true`. The caller is then expected to
 *   proceed to applyQueueAction.
 *
 * `now` is injectable for deterministic expiry tests.
 */
export async function resolveApprovalConfirmation(
  store: Store,
  postId: string,
  providedCode: string | undefined,
  now: () => Date = () => new Date()
): Promise<ApprovalConfirmationResult> {
  const post = await store.get<ApprovalConfirmationFields>("social_posts", postId);
  if (!post) {
    return { ok: false, error: `No social_posts row with id "${postId}".` };
  }

  const nowMs = now().getTime();
  const storedExpiryMs = post.approvalConfirmationExpiresAt ? new Date(post.approvalConfirmationExpiresAt).getTime() : NaN;
  const storedCodeIsLive = !!post.approvalConfirmationCode && Number.isFinite(storedExpiryMs) && storedExpiryMs > nowMs;

  if (providedCode && storedCodeIsLive && providedCode === post.approvalConfirmationCode) {
    await store.update<ApprovalConfirmationFields>("social_posts", postId, {
      approvalConfirmationCode: null,
      approvalConfirmationExpiresAt: null,
    });
    return { ok: true, confirmed: true };
  }

  const code = generateConfirmationCode();
  const expiresAt = new Date(nowMs + APPROVAL_CONFIRMATION_CODE_TTL_MINUTES * 60_000).toISOString();

  await store.update<ApprovalConfirmationFields>("social_posts", postId, {
    approvalConfirmationCode: code,
    approvalConfirmationExpiresAt: expiresAt,
  });

  return { ok: true, confirmed: false, code, expiresAt, expiryMinutes: APPROVAL_CONFIRMATION_CODE_TTL_MINUTES };
}
