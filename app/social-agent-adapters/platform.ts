import type { Analytics, InboxItem, Platform, PostInput, PostResult } from "@/social-agent/ports";

// STUB -- deliberately not implemented in this commit. A real Zernio-backed
// `Platform` is Phase 3's job (see the Phased build plan in
// docs/research/social-media-manager-agent.md), gated on Phase 1's Zernio
// account signup and real platform OAuth, which is human-required and
// explicitly out of scope for this run. This exists only so Phase 2's
// pipeline code has a concrete `Platform` to run against (or a
// logging-only fake built alongside it) while it's developed and
// typechecked, per the doc's "everything except actual publishing and
// actual inbox events can be built and validated against a stub Platform"
// note.
//
// Every method logs the call it would have made (params included, for
// debugging Phase 2 pipeline code against this stub) before throwing, so
// the params are genuinely used rather than just typed and discarded.
//
// Do not fill these in without a real Zernio API key + connected profile.
export function createUnimplementedPlatform(): Platform {
  return {
    async createPost(input: PostInput): Promise<PostResult> {
      console.warn("Platform.createPost called against the unimplemented stub", input);
      throw new Error(
        "Platform.createPost is not implemented -- Zernio provisioning (Phase 1) and the real Zernio-backed Platform adapter (Phase 3) are deferred, out of scope for Phase 0. See social-agent/ports.ts.",
      );
    },

    async getAnalytics(postId: string): Promise<Analytics> {
      console.warn("Platform.getAnalytics called against the unimplemented stub", postId);
      throw new Error(
        "Platform.getAnalytics is not implemented -- see Phase 3 in the Phased build plan (docs/research/social-media-manager-agent.md).",
      );
    },

    async listInbox(accountId: string): Promise<InboxItem[]> {
      console.warn("Platform.listInbox called against the unimplemented stub", accountId);
      throw new Error(
        "Platform.listInbox is not implemented -- see Phase 3 in the Phased build plan (docs/research/social-media-manager-agent.md).",
      );
    },

    async reply(inboxItemId: string, text: string): Promise<void> {
      console.warn("Platform.reply called against the unimplemented stub", { inboxItemId, text });
      throw new Error(
        "Platform.reply is not implemented -- see Phase 3 in the Phased build plan (docs/research/social-media-manager-agent.md).",
      );
    },
  };
}
