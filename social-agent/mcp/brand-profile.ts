// Brand profile read/write for the social-agent MCP server. Backs the
// `get_brand_profile` / `update_brand_profile` tools in
// app/api/mcp/social/route.ts.
//
// `update_brand_profile` is a DIRECT write, no approval gate -- unlike the
// weekly Retro's `pending_diff` self-proposal mechanism (see the
// `social_brand_profile` migration comment: "an operator must approve --
// never auto-applied"), which this file does not touch. Here, Hippo-Assist
// is acting AS the human operator's own interface (a conversational front
// end the operator is driving), not as the system revising its own
// self-model -- so the same direct-write trust level the admin queue's
// PATCH route already gives a logged-in admin applies here too.
//
// Portable: depends only on the Store port, per social-agent/README.md's
// boundary rule. `Store`'s field-name translation (app/social-agent-
// adapters/store.ts's FIELD_ALIASES) already maps this type's `voice` /
// `toneRules` to the real `voice_description` / `tone_guidelines` columns
// (and `bannedTopics` / `disclosureTemplate` translate mechanically) -- see
// that file's own test for the verified mapping. This module only ever
// deals in the camelCase `SocialBrandProfile` shape; the MCP route's tool
// handler is responsible for translating the wire-format (snake_case, to
// match Hippo-Assist's field names from the task) into this shape.

import type { Store } from "../ports";
import type { SocialBrandProfile } from "../pipeline/types";

export async function getBrandProfile(store: Store, accountId: string): Promise<SocialBrandProfile | null> {
  const rows = await store.list<SocialBrandProfile>("social_brand_profile", {
    filters: [{ field: "accountId", op: "eq", value: accountId }],
    limit: 1,
  });
  return rows[0] ?? null;
}

export type BrandProfilePatch = Partial<
  Pick<SocialBrandProfile, "voice" | "toneRules" | "bannedTopics" | "disclosureTemplate">
>;

/**
 * Writes `patch` onto the account's brand profile -- updates the existing
 * row if one exists, otherwise inserts a new one (an account can reach this
 * tool before any brand-profile row has ever been created). Only the fields
 * present in `patch` are touched; omitted fields are left alone on an
 * update, or left unset on a fresh insert.
 */
export async function updateBrandProfile(
  store: Store,
  accountId: string,
  patch: BrandProfilePatch,
  idGenerator: () => string = defaultIdGenerator
): Promise<SocialBrandProfile> {
  const existing = await getBrandProfile(store, accountId);

  if (existing) {
    return store.update<SocialBrandProfile>("social_brand_profile", existing.id, patch);
  }

  return store.insert<SocialBrandProfile>("social_brand_profile", {
    id: idGenerator(),
    accountId,
    voice: patch.voice ?? "",
    toneRules: patch.toneRules ?? [],
    bannedTopics: patch.bannedTopics,
    disclosureTemplate: patch.disclosureTemplate,
  });
}

function defaultIdGenerator(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
