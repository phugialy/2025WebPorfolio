import type { Analytics, InboxItem, Platform, PostInput, PostResult } from "@/social-agent/ports";
import type { SocialPlatformName } from "@/social-agent/pipeline/types";

// Zernio-backed implementation of the `Platform` port (social-agent/ports.ts).
// Real, live-account host glue -- see app/social-agent-adapters/platform.ts's
// stub for why this didn't exist before Phase 1 (real Zernio provisioning)
// landed. Plain `fetch`, no `zernio-node` SDK dependency, matching this
// repo's existing convention for third-party REST APIs (lib/openrouter.ts
// wraps OpenRouter with plain fetch, not an SDK package) -- adding a new npm
// dependency wasn't necessary for the four methods this port needs, and
// every request/response shape below was checked directly against the SDK's
// own generated source rather than guessed, so nothing here is invented:
// https://github.com/zernio-dev/zernio-node, `src/generated/types.gen.ts`
// and `src/generated/sdk.gen.ts` (fetched and read directly this session).
//
// Base URL and auth confirmed working directly against this exact shape
// this session (GET /v1/accounts, GET /v1/profiles both returned real data
// with `Authorization: Bearer $ZERNIO_API_KEY` against
// https://api.zernio.com) -- but see the safety note on `createPost` below:
// no test in this codebase is allowed to make a real call here, and none
// does (every test mocks `fetch`).
const ZERNIO_BASE_URL = "https://api.zernio.com";

// -----------------------------------------------------------------------
// Local request/response types -- deliberately a narrow subset of the real
// SDK types, not a re-export of the whole generated file (that file is
// ~45,000 lines covering every Zernio resource, not just the four this
// adapter's Platform methods need). Each type below is named after, and
// field-for-field matches, the real generated type it corresponds to, cited
// in each comment so a mismatch is easy to re-verify later.
// -----------------------------------------------------------------------

/** Zernio's own platform slugs (types.gen.ts's inline `platform` unions on CreatePostData/ListInboxConversationsData, etc.) -- notably `"twitter"`, not `"x"`, which this port's `SocialPlatformName` uses. */
type ZernioPlatformSlug =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "threads"
  | "pinterest"
  | "reddit"
  | "bluesky"
  | "googlebusiness"
  | "telegram"
  | "snapchat"
  | "discord"
  | "slack"
  | "whatsapp";

/** `SocialPlatformName` (this project's port) -> Zernio's own slug. The only non-identity mapping is x -> twitter. */
const TO_ZERNIO_PLATFORM: Record<SocialPlatformName, ZernioPlatformSlug> = {
  instagram: "instagram",
  facebook: "facebook",
  linkedin: "linkedin",
  x: "twitter",
};

/** Reverse of the above, for mapping inbox conversations back onto this project's narrower `SocialPlatformName` union -- conversations on a platform this project doesn't model (e.g. whatsapp, reddit) are dropped in `listInbox`, not coerced. */
const FROM_ZERNIO_PLATFORM: Partial<Record<string, SocialPlatformName>> = {
  instagram: "instagram",
  facebook: "facebook",
  linkedin: "linkedin",
  twitter: "x",
};

/** Mirrors `MediaItem` (types.gen.ts line ~5923) -- only the fields this adapter sets. */
type ZernioMediaItem = { url: string };

/** Mirrors `CreatePostData["body"]` (types.gen.ts line ~13858-13951, `POST /v1/posts`) -- only the fields this adapter sets. */
type ZernioCreatePostBody = {
  content?: string;
  mediaItems?: ZernioMediaItem[];
  platforms: Array<{ platform: ZernioPlatformSlug; accountId: string }>;
  scheduledFor?: string;
  isDraft?: boolean;
  // Deliberately never set by this adapter -- see the safety comment on
  // `createPost` below. Typed here (rather than omitted) so it's visible
  // that the field exists and is a conscious non-use, not an oversight.
  publishNow?: false;
};

/** Mirrors `Post` (types.gen.ts line ~6561) -- only the fields this adapter reads. */
type ZernioPost = {
  _id?: string;
  status?: "draft" | "scheduled" | "publishing" | "published" | "partial" | "failed" | "cancelled";
};

/** Mirrors `PostCreateResponse` (types.gen.ts line ~6684, the normal 201 body). */
type ZernioPostCreateResponse = {
  message?: string;
  post?: ZernioPost;
  warnings?: string[];
};

/** Mirrors `PostPublishIncompleteResponse` (types.gen.ts line ~6704 -- the 207 body `createPost`/`updatePost` return when the post was saved but the inline publish didn't fully succeed). */
type ZernioPostPublishIncompleteResponse = {
  post?: ZernioPost;
  message?: string;
  error?: string;
  platformResults?: Array<{ platform: string; status: string; error: string | null }>;
  warnings?: string[];
};

/** Mirrors the subset of `PostAnalytics` (types.gen.ts line ~6617) this project's `Analytics` port type actually uses. */
type ZernioPostAnalytics = {
  impressions?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

/** Mirrors `AnalyticsSinglePostResponse` (types.gen.ts line ~1614 -- the body of `GET /v1/analytics?postId=...`, per `getAnalytics`'s own doc comment in sdk.gen.ts: "With postId, returns a single post."). */
type ZernioAnalyticsSinglePostResponse = {
  analytics?: ZernioPostAnalytics;
};

/** Mirrors one entry of `ListInboxConversationsResponse["data"]` (types.gen.ts line ~21689 -- the body of `GET /v1/inbox/conversations`). */
type ZernioConversation = {
  id?: string;
  platform?: string;
  accountId?: string;
  participantName?: string;
  participantId?: string;
  lastMessage?: string;
  updatedTime?: string;
};

/** Mirrors `ListInboxConversationsResponse` (types.gen.ts line ~21689). */
type ZernioListInboxConversationsResponse = {
  data?: ZernioConversation[];
};

// -----------------------------------------------------------------------
// fetch helper
// -----------------------------------------------------------------------

async function zernioRequest<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    // Should be unreachable -- createZernioPlatform() itself already
    // returns null when ZERNIO_API_KEY is unset, so nothing should call
    // this. Guarded anyway, same discipline as generateOpenRouterText's own
    // belt-and-suspenders check right before its fetch call.
    throw new Error("ZERNIO_API_KEY is missing");
  }

  const response = await fetch(`${ZERNIO_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  // A 207 (Multi-Status) is not `response.ok` under the Fetch spec's
  // `ok` definition (200-299 -- 207 IS in that range, so `response.ok` is
  // actually true for it; called out explicitly here so a future reader
  // doesn't have to re-derive that from spec). Every other non-2xx is a
  // real failure.
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zernio request failed: ${response.status} ${path} ${body.slice(0, 500)}`);
  }

  return (await response.json()) as T;
}

/** Maps Zernio's richer per-post status onto this port's coarser `PostResult["status"]` ("scheduled" | "published" | "failed") -- the port type predates this adapter and isn't ours to widen here. `draft`/`scheduled`/`publishing` all mean "exists, not live yet" -> `scheduled`; `published`/`partial` both mean "at least partially live" -> `published` (a `partial` result still carries per-platform detail in `warnings`/`platformResults`, which the caller can inspect via the run log, but this port has no field for it); `failed`/`cancelled` -> `failed`. */
function toPortStatus(zernioStatus: ZernioPost["status"]): PostResult["status"] {
  switch (zernioStatus) {
    case "published":
    case "partial":
      return "published";
    case "failed":
    case "cancelled":
      return "failed";
    case "draft":
    case "scheduled":
    case "publishing":
    default:
      return "scheduled";
  }
}

export function createZernioPlatform(): Platform | null {
  if (!process.env.ZERNIO_API_KEY) {
    return null;
  }

  return {
    /**
     * SAFETY: this method never sends `publishNow: true`, under any
     * circumstance, regardless of what `input` carries -- `PostInput`
     * (social-agent/ports.ts) has no field expressing "publish
     * immediately," only `scheduledFor`, so there is no scheduling intent
     * from the caller this method could conservatively read as "publish
     * now" even if it wanted to. Concretely:
     *   - `input.scheduledFor` set -> send it as Zernio's `scheduledFor`,
     *     which schedules the post for that time (still not an immediate
     *     publish unless that time is already in the past -- Zernio's own
     *     documented behavior, not something this adapter opts into).
     *   - `input.scheduledFor` unset -> `isDraft: true`. Per Zernio's own
     *     SDK docs (CreatePostData's own doc comment): "When none of
     *     scheduledFor, publishNow, or queuedFromProfile are provided, the
     *     post defaults to draft automatically" -- `isDraft: true` here is
     *     belt-and-suspenders, making the safe default explicit rather than
     *     relying on Zernio's own fallback.
     * This matches this project's graduated-autonomy design (see the
     * state-machine.ts fix in this same change): even once a human has
     * approved a post (the only way `advancePost`'s "approved" case, which
     * calls this method, is ever reached), this adapter still never
     * force-publishes synchronously -- it schedules or drafts, and Zernio's
     * own publish pipeline (or a later, explicit publish step) takes it
     * from there.
     */
    async createPost(input: PostInput): Promise<PostResult> {
      const body: ZernioCreatePostBody = {
        content: input.text,
        mediaItems: input.mediaUrls?.map((url) => ({ url })),
        platforms: [{ platform: TO_ZERNIO_PLATFORM[input.platform], accountId: input.accountId }],
        ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : { isDraft: true }),
      };

      const result = await zernioRequest<
        ZernioPostCreateResponse | ZernioPostPublishIncompleteResponse
      >("/v1/posts", { method: "POST", body });

      const post = result.post;
      if (!post?._id) {
        throw new Error(
          `Zernio createPost response had no post._id -- response: ${JSON.stringify(result).slice(0, 500)}`,
        );
      }

      return {
        platformPostId: post._id,
        status: toPortStatus(post.status),
      };
    },

    async getAnalytics(postId: string): Promise<Analytics> {
      const result = await zernioRequest<ZernioAnalyticsSinglePostResponse>(
        `/v1/analytics?postId=${encodeURIComponent(postId)}`,
      );
      const analytics = result.analytics ?? {};

      return {
        impressions: analytics.impressions,
        linkClicks: analytics.clicks,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
      };
    },

    async listInbox(accountId: string): Promise<InboxItem[]> {
      const result = await zernioRequest<ZernioListInboxConversationsResponse>(
        `/v1/inbox/conversations?accountId=${encodeURIComponent(accountId)}`,
      );

      const items: InboxItem[] = [];
      for (const conversation of result.data ?? []) {
        const platform = conversation.platform ? FROM_ZERNIO_PLATFORM[conversation.platform] : undefined;
        // Conversations on a platform this project doesn't model (e.g.
        // whatsapp, reddit) are dropped rather than coerced onto the wrong
        // `SocialPlatformName` -- see FROM_ZERNIO_PLATFORM's own comment.
        if (!platform || !conversation.id) continue;

        items.push({
          id: conversation.id,
          accountId: conversation.accountId ?? accountId,
          platform,
          fromHandle: conversation.participantName || conversation.participantId || "unknown",
          text: conversation.lastMessage ?? "",
          receivedAt: conversation.updatedTime ?? new Date().toISOString(),
        });
      }
      return items;
    },

    /**
     * `POST /v1/inbox/conversations/{conversationId}/messages` (Zernio's
     * `SendInboxMessageData`, types.gen.ts line ~22554) requires an
     * `accountId` in its body -- which account to send FROM -- but this
     * port's `reply(inboxItemId, text)` signature (social-agent/ports.ts,
     * fixed, not ours to widen here) carries no `accountId`. Zernio's own
     * single-conversation lookup (`GET /v1/inbox/conversations/{id}`) is no
     * help either -- its own doc comment says it "Requires accountId query
     * parameter," so it can't resolve the account we don't have. The
     * available workaround: list conversations unfiltered (no `accountId`
     * query param -- confirmed optional on `ListInboxConversationsData`)
     * and find the matching row, which does carry its own `accountId`. This
     * is a real, documented limitation, not an oversight: on an account
     * with many open conversations this is one extra list call per reply
     * and isn't guaranteed to find the row on the first page if pagination
     * is needed -- worth tightening (e.g. widening the `Platform.reply`
     * signature to accept `accountId`) in a follow-up, out of scope for
     * this change per the constraint against touching ports.ts.
     */
    async reply(inboxItemId: string, text: string): Promise<void> {
      const list = await zernioRequest<ZernioListInboxConversationsResponse>(`/v1/inbox/conversations`);
      const conversation = (list.data ?? []).find((c) => c.id === inboxItemId);
      if (!conversation?.accountId) {
        throw new Error(
          `Zernio reply: could not resolve an accountId for conversation ${inboxItemId} from an unfiltered conversation list.`,
        );
      }

      await zernioRequest(`/v1/inbox/conversations/${encodeURIComponent(inboxItemId)}/messages`, {
        method: "POST",
        body: { accountId: conversation.accountId, message: text },
      });
    },
  };
}
