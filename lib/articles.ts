import type { BlogPost } from "@/lib/convex-posts";
import * as convexPosts from "@/lib/convex-posts";
import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";

type ArticleStatus =
  | "draft"
  | "new"
  | "reviewed"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  canonical_url: string | null;
  source_name: string | null;
  author: string | null;
  tags: string[] | null;
  status: ArticleStatus;
  quality_score: number | null;
  notes: string | null;
  ai_summary: string | null;
  ai_score: number | null;
  read_time: number | null;
  views: number | null;
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  hero_image_url: string | null;
  image_prompts: Array<{
    role: string;
    prompt: string;
    alt: string;
  }> | null;
  image_assets: Array<{
    role: string;
    url: string;
    alt?: string;
    prompt?: string;
  }> | null;
  portfolio_lane: string | null;
  info_cards: Array<{
    label: string;
    title: string;
    body: string;
  }> | null;
  raw_payload: unknown;
};

export type { BlogPost };

export type ArticleInput = {
  title: string;
  slug?: string;
  content: string;
  canonicalUrl?: string;
  source: string;
  author?: string;
  tags?: string[];
  quality?: number;
  notes?: string;
  aiSummary?: string;
  aiScore?: number;
  status?: ArticleStatus;
  publishAt?: string;
  rawPayload?: Record<string, unknown>;
  portfolioLane?: string;
  editorialScore?: number;
  editorialFramework?: string;
  heroImageUrl?: string;
  imagePrompts?: Array<{
    role: string;
    prompt: string;
    alt: string;
  }>;
  imageAssets?: Array<{
    role: string;
    url: string;
    alt?: string;
    prompt?: string;
  }>;
  infoCards?: Array<{
    label: string;
    title: string;
    body: string;
  }>;
};

function toTimestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : Date.now();
}

function shouldUseConvexFallback() {
  return process.env.ARTICLES_CONTENT_SOURCE !== "supabase";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item)).filter(Boolean);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return undefined;
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimForMeta(value: string, limit = 155) {
  const text = stripMarkdown(value);
  if (text.length <= limit) return text;
  const sliced = text.slice(0, limit - 1).trim();
  return `${sliced.replace(/[.,;:!?]+$/, "")}...`;
}

function pickHook(content: string, fallback: string) {
  const source = stripMarkdown(content);
  const weakPatterns = /^(phu explores|this article|this post|the article|in this note|i explore)\b/i;
  const hookPatterns =
    /\b(not|but|real|risk|trust|reliable|workflow|review|human|proof|guardrail|maturity|automation|teams?|businesses?|should|need|cost|decision|leaders?|operators?)\b/i;
  const sentence = source
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .find(
      (item) =>
        item.length >= 70 &&
        item.length <= 210 &&
        !weakPatterns.test(item) &&
        hookPatterns.test(item)
    );

  return sentence || fallback;
}

function buildPublicArticleMetadata(article: ArticleRow) {
  const raw = asRecord(article.raw_payload);
  const researchBrief = asRecord(raw.researchBrief);
  const writerHandoff = asRecord(researchBrief.writerHandoff);
  const readerBridge = asRecord(writerHandoff.readerBridge);
  const draftPackage = asRecord(raw.draftPackage);
  const deliveryNote = asRecord(draftPackage.deliveryNote);
  const finalContent = asRecord(draftPackage.finalContent);
  const criticReview = asRecord(raw.criticReview);
  const imageBrief = asRecord(raw.imageBrief);
  const publicMetadata = asRecord(raw.publicMetadata);
  const firstImage = article.image_assets?.[0];

  const fallbackHook = pickHook(
    article.content,
    `The real question behind ${article.title} is what changes for the people who have to make the workflow reliable.`
  );
  const readerTakeaway = firstText(
    publicMetadata.readerTakeaway,
    finalContent.readerTakeaway,
    imageBrief.readerTakeaway,
    readerBridge.practicalPayoff
  );
  const readerHook = firstText(
    publicMetadata.readerHook,
    publicMetadata.hook,
    finalContent.summary,
    readerBridge.readerQuestion,
    readerBridge.readerPain,
    readerBridge.practicalPayoff,
    fallbackHook,
    article.ai_summary,
    article.excerpt
  );
  const readerPayoff = firstText(
    publicMetadata.readerPayoff,
    readerBridge.practicalPayoff,
    readerTakeaway
  );
  const mainAngle = firstText(
    publicMetadata.mainAngle,
    deliveryNote.mainAngle,
    writerHandoff.angle
  );
  const intendedAudience = firstText(
    publicMetadata.intendedAudience,
    deliveryNote.audience,
    writerHandoff.audience
  );
  const sourceLinks = cleanTextArray(writerHandoff.sourceLinks);
  const sourceQualityNotes = cleanTextArray(criticReview.sourceQualityNotes);
  const evidenceNotes = cleanTextArray(criticReview.evidenceNotes);
  const heroImageCaption = firstText(
    publicMetadata.heroImageCaption,
    firstImage?.alt,
    imageBrief.readerTakeaway && `The image frames the reader takeaway: ${cleanText(imageBrief.readerTakeaway)}`,
    readerTakeaway && `The image frames the reader takeaway: ${readerTakeaway}`
  );
  const shareQuote = firstText(publicMetadata.shareQuote, raw.shareQuote, fallbackHook);
  const seoDescription =
    firstText(publicMetadata.seoDescription, readerHook, article.ai_summary, article.notes) ||
    trimForMeta(article.content);
  const sourceQualityNote = firstText(
    publicMetadata.sourceQualityNote,
    sourceQualityNotes[0],
    evidenceNotes[0],
    sourceLinks.length
      ? `Built from ${sourceLinks.length} source ${sourceLinks.length === 1 ? "reference" : "references"} and filtered through practical implementation judgment.`
      : article.canonical_url
        ? "Built from source research and filtered through practical implementation judgment."
        : undefined
  );

  return {
    readerHook: readerHook || fallbackHook,
    readerProblem: firstText(publicMetadata.readerProblem, readerBridge.readerPain),
    readerQuestion: firstText(publicMetadata.readerQuestion, readerBridge.readerQuestion),
    readerTakeaway,
    readerPayoff,
    likelyMisunderstanding: firstText(
      publicMetadata.likelyMisunderstanding,
      readerBridge.likelyMisunderstanding
    ),
    familiarExample: firstText(publicMetadata.familiarExample, readerBridge.familiarExample),
    articleType: firstText(publicMetadata.articleType, deliveryNote.articleType),
    intendedAudience,
    mainAngle,
    readerEffect: firstText(publicMetadata.readerEffect, deliveryNote.readerEffect),
    sourceQualityNote,
    shareQuote,
    heroImageCaption,
    seoDescription: trimForMeta(seoDescription, 160),
    publicAgentSummary: firstText(
      [
        mainAngle,
        intendedAudience && `Audience: ${intendedAudience}`,
        readerPayoff && `Reader payoff: ${readerPayoff}`,
      ]
        .filter(Boolean)
        .join(" "),
      article.ai_summary && `Public summary: ${article.ai_summary}`
    ),
    sourceLinks,
  };
}

function toBlogPost(article: ArticleRow): BlogPost {
  const publicMetadata = buildPublicArticleMetadata(article);

  return {
    _id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    canonicalUrl: article.canonical_url || "",
    source: article.source_name || "supabase",
    author: article.author || undefined,
    tags: article.tags || [],
    quality: article.quality_score ?? undefined,
    notes: article.notes || article.excerpt || undefined,
    status: article.status,
    publishDate: article.publish_at
      ? new Date(article.publish_at).getTime()
      : article.published_at
        ? new Date(article.published_at).getTime()
        : undefined,
    createdAt: toTimestamp(article.created_at),
    updatedAt: toTimestamp(article.updated_at),
    metadata: {
      readTime: article.read_time ?? undefined,
      aiSummary: article.ai_summary || article.excerpt || undefined,
      aiScore: article.ai_score ?? undefined,
      views: article.views ?? 0,
      portfolioLane: article.portfolio_lane || undefined,
      heroImageUrl: article.hero_image_url || undefined,
      imagePrompts: article.image_prompts || undefined,
      imageAssets: article.image_assets || undefined,
      infoCards: article.info_cards || undefined,
      ...publicMetadata,
    },
  };
}

function mergeBySlug(primary: BlogPost[], fallback: BlogPost[]) {
  const seen = new Set<string>();
  const merged: BlogPost[] = [];

  for (const post of [...primary, ...fallback]) {
    if (seen.has(post.slug)) {
      continue;
    }
    seen.add(post.slug);
    merged.push(post);
  }

  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

export function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export function estimateReadTime(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export async function getSupabaseArticles(status?: ArticleStatus) {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(100);
  if (error) {
    console.error("Error fetching Supabase articles:", error);
    return [];
  }

  return (data || []).map((row) => toBlogPost(row as ArticleRow));
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await getSupabaseArticles("published");
  if (!shouldUseConvexFallback()) {
    return supabase;
  }

  const fallback = await convexPosts.getPublishedPosts();
  return mergeBySlug(supabase, fallback);
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const supabase = await getSupabaseArticles("published");
  if (!shouldUseConvexFallback()) {
    return supabase;
  }

  const fallback = await convexPosts.getAllPosts();
  return mergeBySlug(supabase, fallback);
}

export async function getAllDrafts(): Promise<BlogPost[]> {
  const supabase = await getSupabaseArticles();
  if (!shouldUseConvexFallback()) {
    return supabase;
  }

  const fallback = await convexPosts.getAllDrafts();
  return mergeBySlug(supabase, fallback);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createSupabaseReadClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return toBlogPost(data as ArticleRow);
    }
  }

  if (!shouldUseConvexFallback()) {
    return null;
  }

  return convexPosts.getPostBySlug(slug);
}

export async function incrementPostViews(slug: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("articles")
      .select("id, views")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      await supabase
        .from("articles")
        .update({ views: Number(data.views || 0) + 1 })
        .eq("id", data.id);
      return;
    }
  }

  if (!shouldUseConvexFallback()) {
    return;
  }

  await convexPosts.incrementPostViews(slug);
}

export async function upsertArticleDraft(input: ArticleInput) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const slug = input.slug || generateSlug(input.title);
  const nowStatus = input.status || "draft";
  const { data, error } = await supabase
    .from("articles")
    .upsert(
      {
        title: input.title,
        slug,
        content: input.content,
        excerpt: input.aiSummary || input.notes || input.content.slice(0, 220),
        canonical_url: input.canonicalUrl || "",
        source_name: input.source,
        author: input.author || "Automation",
        tags: input.tags || [],
        status: nowStatus,
        quality_score: input.quality,
        notes: input.notes,
        ai_summary: input.aiSummary,
        ai_score: input.aiScore,
        read_time: estimateReadTime(input.content),
        publish_at: input.publishAt,
        published_at: nowStatus === "published" ? new Date().toISOString() : null,
        raw_payload: input.rawPayload || {},
        portfolio_lane: input.portfolioLane,
        editorial_score: input.editorialScore,
        editorial_framework: input.editorialFramework,
        hero_image_url: input.heroImageUrl,
        image_prompts: input.imagePrompts || [],
        image_assets: input.imageAssets || [],
        info_cards: input.infoCards || [],
      },
      { onConflict: "slug" }
    )
    .select("id, slug, status")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
