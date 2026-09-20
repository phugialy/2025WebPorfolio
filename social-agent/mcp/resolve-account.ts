// Account scoping for the social-agent MCP server (app/api/mcp/social/route.ts).
//
// Every social_* table is account_id-scoped (see supabase/migrations/0017_
// social_agent_foundation.sql's own comment: "multi-tenant from day one").
// In practice, exactly one real `social_accounts` row exists today (Phase 1's
// Zernio signup is separate, human-required, and hasn't happened for a
// second tenant) -- the same situation reliability/watchdog.ts's own
// `RunSocialWatchdogDeps.accountId` comment documents ("at most one real
// account provisioned so far").
//
// Chosen approach (stated in the MCP build's report): every account-scoped
// MCP tool accepts an OPTIONAL `accountId` argument. When omitted, this
// function auto-resolves it -- but only when the resolution is unambiguous
// (exactly one social_accounts row exists). Zero or multiple rows is a
// caller-visible error asking for an explicit accountId, never a silent
// guess (same "don't guess, report a blocker" discipline the rest of this
// feature already follows -- e.g. guardrail.ts's parse-failure-defaults-to-
// reject rule). This is simpler than building real multi-tenant account
// selection UX for a system with one real tenant today, while the optional
// parameter means adding a second tenant later doesn't require an API
// shape change, only Hippo-Assist starting to pass it.
//
// Portable: depends only on the Store port, per social-agent/README.md's
// boundary rule.

import type { Store } from "../ports";

export type ResolveAccountResult = { ok: true; accountId: string } | { ok: false; error: string };

/** Minimal shape this needs from a `social_accounts` row -- just enough to confirm existence/uniqueness, not the full row. */
type SocialAccountRef = { id: string };

export async function resolveAccountId(store: Store, accountId?: string): Promise<ResolveAccountResult> {
  if (accountId) {
    const found = await store.get<SocialAccountRef>("social_accounts", accountId);
    if (!found) {
      return { ok: false, error: `No social_accounts row with id "${accountId}".` };
    }
    return { ok: true, accountId };
  }

  const accounts = await store.list<SocialAccountRef>("social_accounts", {});

  if (accounts.length === 0) {
    return {
      ok: false,
      error: "No social_accounts rows exist yet -- nothing for this tool to operate on.",
    };
  }

  if (accounts.length > 1) {
    return {
      ok: false,
      error:
        `${accounts.length} social_accounts rows exist -- pass an explicit accountId ` +
        "(auto-resolution only works when there's exactly one account).",
    };
  }

  return { ok: true, accountId: accounts[0].id };
}
