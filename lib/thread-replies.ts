import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profiles";

export type ThreadReply = {
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  author_email: string;
  author_name: string;
  author_image: string | null;
  body: string;
  status: "visible" | "hidden" | "removed";
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
};

const MAX_REPLIES_PER_HOUR = 10;

// --- Public reads ---

export async function getVisibleReplies(threadId: string): Promise<ThreadReply[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("thread_replies")
    .select("*")
    .eq("thread_id", threadId)
    .eq("status", "visible")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching thread replies:", error);
    return [];
  }

  return (data || []) as ThreadReply[];
}

// --- Reply creation (called from the public reply API route) ---

export async function countRecentRepliesByUser(email: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return 0;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("thread_replies")
    .select("*", { count: "exact", head: true })
    .eq("author_email", email.toLowerCase())
    .gte("created_at", oneHourAgo);

  return count || 0;
}

export type ReplyErrorCode = "closed" | "not_registered" | "muted" | "banned" | "rate_limited";

export type CreateReplyResult =
  | { ok: true; reply: ThreadReply }
  | { ok: false; error: string; status: number; code: ReplyErrorCode | "invalid" | "server_error" };

/**
 * All the write-time checks live here (not just in the API route) so any
 * future caller gets the same guarantees: the thread must actually have
 * replies_enabled, the author must be a registered profile (signing in with
 * Google alone isn't enough -- registration is a deliberate second step),
 * must not be muted/banned, and rate limiting applies regardless of who's
 * calling.
 */
export async function createReply(params: {
  threadId: string;
  parentReplyId?: string;
  authorEmail: string;
  authorImage?: string | null;
  body: string;
}): Promise<CreateReplyResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase write config is missing", status: 500, code: "server_error" };
  }

  const body = params.body.trim();
  if (!body) {
    return { ok: false, error: "Reply can't be empty.", status: 400, code: "invalid" };
  }
  if (body.length > 2000) {
    return { ok: false, error: "Reply is too long (2000 characters max).", status: 400, code: "invalid" };
  }

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, replies_enabled, status")
    .eq("id", params.threadId)
    .maybeSingle();

  if (threadError || !thread || thread.status !== "published" || !thread.replies_enabled) {
    return { ok: false, error: "Replies aren't open on this Field Note.", status: 403, code: "closed" };
  }

  const profile = await getProfile(params.authorEmail);
  if (!profile) {
    return {
      ok: false,
      error: "You need to register before replying.",
      status: 403,
      code: "not_registered",
    };
  }
  if (profile.status === "banned") {
    return { ok: false, error: "You can't reply right now.", status: 403, code: "banned" };
  }
  if (profile.status === "muted") {
    return {
      ok: false,
      error: "Your ability to reply has been temporarily limited.",
      status: 403,
      code: "muted",
    };
  }

  const recentCount = await countRecentRepliesByUser(params.authorEmail);
  if (recentCount >= MAX_REPLIES_PER_HOUR) {
    return {
      ok: false,
      error: "You're replying too quickly -- try again in a bit.",
      status: 429,
      code: "rate_limited",
    };
  }

  const { data, error } = await supabase
    .from("thread_replies")
    .insert({
      thread_id: params.threadId,
      parent_reply_id: params.parentReplyId || null,
      author_email: params.authorEmail.toLowerCase(),
      author_name: profile.display_name,
      author_image: params.authorImage || null,
      body,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message, status: 500, code: "server_error" };
  }

  return { ok: true, reply: data as ThreadReply };
}

// --- Admin: moderation ---

export type ModerationReplyRow = ThreadReply & {
  threads: { title: string | null } | null;
};

export async function listRecentRepliesForModeration(limit = 50): Promise<ModerationReplyRow[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("thread_replies")
    .select("*, threads(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as unknown as ModerationReplyRow[];
}

export async function setReplyStatus(
  id: string,
  status: "visible" | "hidden" | "removed",
  moderatedBy: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("thread_replies")
    .update({ status, moderated_by: moderatedBy, moderated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}
