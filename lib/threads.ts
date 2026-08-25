import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";
import type { AffiliateProduct } from "@/lib/affiliate";

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
};

export type ThreadInput = {
  title?: string;
  body: string;
  tags?: string[];
  resourceId?: string;
  status?: "draft" | "published";
};

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

  return (data || []) as unknown as Thread[];
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

  return data as unknown as Thread;
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

  return (data || []) as unknown as Thread[];
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

  return data as Thread;
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
