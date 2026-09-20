// Ports for the social media manager agent's core business logic.
//
// These interfaces are the ONLY thing pipeline code (Phase 2+: Strategist,
// Writer, Guardrail Critic, state machine, etc.) is allowed to depend on.
// No `@supabase/supabase-js` import, no `process.env.X` read, no Next.js
// import belongs on this side of the boundary -- see README.md for the
// full reasoning. Concrete implementations (Supabase-backed `Store`,
// OpenRouter-backed `LLM`, Zernio-backed `Platform`) live under `app/`
// as thin host-glue and get passed into pipeline functions as plain
// parameters.
//
// Deliberately independent of this repo's existing concrete types
// (`lib/openrouter.ts`'s `OpenRouterMessage`, Supabase's row types, etc.)
// even where the shapes overlap today -- a port that quietly imports a
// concrete type isn't actually decoupled, it just looks decoupled until
// the concrete type changes.

/** A single chat-style message, provider-agnostic. */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Token accounting, kept optional and provider-agnostic (not every LLM backend reports all three). */
export type Usage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type LLMResult = {
  content: string;
  usage?: Usage;
};

/**
 * Text generation. One method, deliberately -- the pipeline never needs
 * streaming, function-calling, or multi-modal output for this feature's
 * steps (signal-scan, strategist, writer, guardrail critic, retro all
 * produce a single JSON or prose response per call).
 */
export interface LLM {
  generateText(messages: Message[], opts?: { model?: string }): Promise<LLMResult>;
}

/** A single equality/comparison filter for `Store.list`. */
export type QueryFilter = {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: unknown;
};

/**
 * Intentionally small: every known Phase 2+ read pattern (rows for one
 * account, rows in a given status, most-recent-N) is expressible as a
 * handful of equality/comparison filters plus an order and a limit. If a
 * later phase needs something this can't express, extend this type --
 * don't reach past `Store` back into a concrete query builder.
 */
export type Query = {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
};

/**
 * Generic persistence port. `collection` is a table/collection name (e.g.
 * `"social_posts"`); callers are responsible for knowing the shape `T` for
 * a given collection, same division of responsibility `market-intelligence.ts`
 * already has with `.from("affiliate_products")` today -- the difference is
 * that call now goes through this interface instead of a Supabase client
 * directly, so a non-Supabase `Store` can be swapped in without touching
 * pipeline code.
 */
export interface Store {
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, query: Query): Promise<T[]>;
  insert<T>(collection: string, row: T): Promise<T>;
  update<T>(collection: string, id: string, patch: Partial<T>): Promise<T>;
}

/** Input to create one post on one platform. Kept intentionally thin for Phase 0 -- see README.md for why no adapter implements this yet. */
export type PostInput = {
  accountId: string;
  platform: "instagram" | "facebook" | "linkedin" | "x";
  text: string;
  mediaUrls?: string[];
  scheduledFor?: string;
};

export type PostResult = {
  platformPostId: string;
  status: "scheduled" | "published" | "failed";
};

export type Analytics = {
  impressions?: number;
  linkClicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

export type InboxItem = {
  id: string;
  accountId: string;
  platform: "instagram" | "facebook" | "linkedin" | "x";
  fromHandle: string;
  text: string;
  receivedAt: string;
};

/**
 * Social platform port (Zernio, in this project's case). No implementation
 * ships in Phase 0 -- see the "Phase 3's job" stub note in
 * app/social-agent-adapters/platform.ts. Defined here now, ahead of that
 * implementation, purely so Phase 2's pipeline code can be written and
 * typechecked against a real interface instead of `any`, and swapped from
 * a fake/logging implementation to the real Zernio-backed one later
 * without touching pipeline code.
 */
export interface Platform {
  createPost(input: PostInput): Promise<PostResult>;
  getAnalytics(postId: string): Promise<Analytics>;
  listInbox(accountId: string): Promise<InboxItem[]>;
  reply(inboxItemId: string, text: string): Promise<void>;
}

/**
 * Request authorization check, abstracted the same way as the other three
 * -- so pipeline/route code depends on "is this call authorized," never on
 * `isAuthorizedCronRequest` or `CRON_SECRET` directly.
 */
export interface AuthGate {
  isAuthorized(request: Request): boolean;
}
