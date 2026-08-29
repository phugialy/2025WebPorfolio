import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";
import type { AffiliateProduct } from "@/lib/affiliate";

export type ThreadArticle = { id: string; title: string; slug: string };

export type Thread = {
  id: string;
  title: string | null;
  body: string;
  tags: string[];
  resource_id: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  affiliate_products?: AffiliateProduct | null;
  articles: ThreadArticle[];
};

export type ThreadInput = {
  title?: string;
  body: string;
  tags?: string[];
  resourceId?: string;
  articleIds?: string[];
  status?: "draft" | "published";
};

type RawThreadRow = Omit<Thread, "articles">;

// Supabase doesn't support embedding a many-to-many relation as a plain
// array through a single select() the way the old direct FK could -- fetch
// the join rows separately and attach them, one query regardless of how
// many threads are in the batch.
async function attachArticles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  threads: RawThreadRow[]
): Promise<Thread[]> {
  if (threads.length === 0) return [];

  const { data: links, error } = await supabase
    .from("thread_articles")
    .select("thread_id, articles(id, title, slug)")
    .in(
      "thread_id",
      threads.map((t) => t.id)
    );

  if (error) {
    console.error("Error attaching articles to threads:", error);
    return threads.map((t) => ({ ...t, articles: [] }));
  }

  const byThread = new Map<string, ThreadArticle[]>();
  for (const link of links || []) {
    if (!link.articles) continue;
    const list = byThread.get(link.thread_id) || [];
    list.push(link.articles as ThreadArticle);
    byThread.set(link.thread_id, list);
  }

  return threads.map((t) => ({ ...t, articles: byThread.get(t.id) || [] }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setThreadArticles(supabase: any, threadId: string, articleIds: string[]) {
  const { error: deleteError } = await supabase
    .from("thread_articles")
    .delete()
    .eq("thread_id", threadId);
  if (deleteError) throw deleteError;

  if (articleIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("thread_articles")
    .insert(articleIds.map((articleId) => ({ thread_id: threadId, article_id: articleId })));
  if (insertError) throw insertError;
}

// --- Public reads ---

export async function listPublishedThreads(): Promise<Thread[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("threads")
    .select("*, affiliate_products(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error listing published threads:", error);
    return [];
  }

  return attachArticles(supabase, (data || []) as RawThreadRow[]);
}

/**
 * Field Notes linked to one article, for the in-article "Field Notes"
 * section. Threads stay broadcast-only -- this is not a comments system,
 * just the owner's own ongoing commentary tagged to one or more articles.
 */
export async function getPublishedThreadsForArticle(articleId: string): Promise<Thread[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data: links, error: linksError } = await supabase
    .from("thread_articles")
    .select("thread_id")
    .eq("article_id", articleId);

  if (linksError) {
    console.error("Error listing field notes for article:", linksError);
    return [];
  }

  const threadIds = (links || []).map((l) => l.thread_id);
  if (threadIds.length === 0) return [];

  const { data, error } = await supabase
    .from("threads")
    .select("*, affiliate_products(*)")
    .eq("status", "published")
    .in("id", threadIds)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error listing field notes for article:", error);
    return [];
  }

  return attachArticles(supabase, (data || []) as RawThreadRow[]);
}

export async function getPublishedThreadById(id: string): Promise<Thread | null> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("threads")
    .select("*, affiliate_products(*)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [thread] = await attachArticles(supabase, [data as RawThreadRow]);
  return thread;
}

// --- Admin: composer + management ---

export async function listAllThreads(): Promise<Thread[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("threads")
    .select("*, affiliate_products(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return attachArticles(supabase, (data || []) as RawThreadRow[]);
}

export async function createThread(input: ThreadInput): Promise<Thread> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const status = input.status || "draft";
  const { data, error } = await supabase
    .from("threads")
    .insert({
      title: input.title || null,
      body: input.body,
      tags: input.tags || [],
      resource_id: input.resourceId || null,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (input.articleIds && input.articleIds.length > 0) {
    await setThreadArticles(supabase, data.id, input.articleIds);
  }

  const [thread] = await attachArticles(supabase, [data as RawThreadRow]);
  return thread;
}

export async function updateThread(
  id: string,
  input: Partial<ThreadInput>
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updates.title = input.title || null;
  if (input.body !== undefined) updates.body = input.body;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.resourceId !== undefined) updates.resource_id = input.resourceId || null;

  const { error } = await supabase.from("threads").update(updates).eq("id", id);

  if (error) {
    throw error;
  }

  if (input.articleIds !== undefined) {
    await setThreadArticles(supabase, id, input.articleIds);
  }
}

export async function setThreadStatus(
  id: string,
  status: "draft" | "published"
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("threads")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteThread(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase.from("threads").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
