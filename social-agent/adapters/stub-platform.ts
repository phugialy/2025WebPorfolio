// Stub Platform adapter -- logs what it would have done instead of calling
// a real API. This is what lets Phase 2's pipeline and state machine be
// built and fully tested without Zernio, per the research doc's Phased
// build plan (Phase 2 row: "against a fake Platform that logs instead of
// posting").
//
// Lives under /social-agent/adapters/, not /app/, by explicit scope for
// this build: real host-glue adapters (Supabase-backed Store,
// OpenRouter-backed LLM, and eventually a real Zernio-backed Platform) are
// Phase 0/3's responsibility under app/social-agent-adapters/ per
// ports.ts's own comment. This one is different -- it's not a "real"
// implementation of anything, it's a deterministic double that only Phase
// 2's own tests and local exploration need, so it stays inside
// /social-agent/ alongside the pipeline code it exists to unblock.

import type { Analytics, InboxItem, Platform, PostInput, PostResult } from "../ports";

export type StubPlatformLogger = (message: string, meta?: Record<string, unknown>) => void;

const defaultLogger: StubPlatformLogger = (message, meta) => {
  console.log(`[stub-platform] ${message}`, meta ?? {});
};

/**
 * Creates a `Platform` implementation that never makes a real network call.
 * `createPost` "succeeds" deterministically (scheduled if `scheduledFor` is
 * set, published otherwise) so the state machine can be exercised
 * end-to-end; `getAnalytics`/`listInbox`/`reply` return inert stub data.
 * Pass a custom `logger` (e.g. to capture calls in a test) instead of the
 * default `console.log`.
 */
export function createStubPlatform(opts?: { logger?: StubPlatformLogger }): Platform {
  const log = opts?.logger ?? defaultLogger;
  let counter = 0;

  return {
    async createPost(input: PostInput): Promise<PostResult> {
      counter += 1;
      const platformPostId = `stub-${input.platform}-${counter}-${Date.now()}`;
      log("createPost (stub -- not actually sent to any platform)", {
        platform: input.platform,
        accountId: input.accountId,
        textPreview: input.text.slice(0, 80),
        scheduledFor: input.scheduledFor,
      });
      return {
        platformPostId,
        status: input.scheduledFor ? "scheduled" : "published",
      };
    },

    async getAnalytics(postId: string): Promise<Analytics> {
      log("getAnalytics (stub -- zero data)", { postId });
      return { impressions: 0, linkClicks: 0, likes: 0, comments: 0, shares: 0 };
    },

    async listInbox(accountId: string): Promise<InboxItem[]> {
      log("listInbox (stub -- always empty)", { accountId });
      return [];
    },

    async reply(inboxItemId: string, text: string): Promise<void> {
      log("reply (stub -- not actually sent)", { inboxItemId, textPreview: text.slice(0, 80) });
    },
  };
}
