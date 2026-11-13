import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";
import { isLikelyBot } from "@/lib/bot-detection";
import { DEALS_TAG, withoutDealsGuides } from "@/lib/deals-core";
import { guardImageUrl } from "@/lib/storage-guard";

// The live articles.tags column is jsonb (the repo migration says text[]), so a
// containment filter must be the JSON array form: ["holiday-guide"].
const DEALS_TAG_JSON = JSON.stringify([DEALS_TAG]);
import { revalidateTag, unstable_cache } from "next/cache";

// Cache tag shared by every cached article read below. Publishing or editing
// an article calls revalidateArticles() so readers see it immediately; the
// time-based revalidate is the backstop for edits made outside that path.
export const ARTICLES_CACHE_TAG = "articles";

export function revalidateArticles() {
  try {
    revalidateTag(ARTICLES_CACHE_TAG);
  } catch {
    // Outside a Next request (e.g. the rss:harvest script) there is nothing
    // to revalidate; the cache expires on its own within a few minutes.
  }
}

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
  editorial_lens: string | null;
  phugialy_take: string | null;
  what_wed_do: string | null;
  commercial_relevance_note: string | null;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  content: string;
  canonicalUrl: string;
  source: string;
  author?: string;
  tags: string[];
  quality?: number;
  notes?: string;
  status: ArticleStatus;
  publishDate?: number;
  createdAt: number;
  updatedAt: number;
  metadata: {
    readTime?: number;
    aiSummary?: string;
    aiScore?: number;
    views?: number;
    portfolioLane?: string;
    heroImageUrl?: string;
    imagePrompts?: Array<{ role: string; prompt: string; alt: string }>;
    imageAssets?: Array<{ role: string; url: string; alt?: string; prompt?: string }>;
    infoCards?: Array<{ label: string; title: string; body: string }>;
    editorialLens?: string;
    phugialyTake?: string;
    whatWedDo?: string;
    rankScore?: number;
    readerHook?: string;
    readerProblem?: string;
    readerQuestion?: string;
    readerTakeaway?: string;
    readerPayoff?: string;
    likelyMisunderstanding?: string;
    familiarExample?: string;
    articleType?: string;
    intendedAudience?: string;
    mainAngle?: string;
    readerEffect?: string;
    sourceQualityNote?: string;
    shareQuote?: string;
    heroImageCaption?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    keepReadingHook?: string;
    excerpt?: string;
    publicAgentSummary?: string;
    sourceLinks?: string[];
  };
};

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
  // raw.metaDescription/seoKeywords/keepReadingHook are the pipeline's post-2026-08-30
  // rework fields -- a flat, purpose-built shape (not nested under
  // publicMetadata/researchBrief like the older payload), so they're checked
  // first here rather than folded into the older fallback chains below.
  const pipelineMetaDescription = firstText(raw.metaDescription);
  const seoKeywords = cleanTextArray(raw.seoKeywords);
  const keepReadingHook = firstText(raw.keepReadingHook);
  // article.notes deliberately excluded from this chain: it holds the
  // editor's internal keep/hold/kill verdict reasoning, never reader-facing
  // copy, per explicit confirmation from the content-pipeline session
  // (2026-08-30) -- a reader seeing verdict notes would be actively
  // confusing, not just a low-quality fallback.
  const seoDescription =
    pipelineMetaDescription ||
    firstText(publicMetadata.seoDescription, readerHook, article.ai_summary) ||
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
    seoKeywords,
    keepReadingHook,
    // The "hook" excerpt written specifically to stand alone as a teaser --
    // distinct from seoDescription (meta-tag copy) and from `notes` (which
    // holds internal editor reasoning, not reader-facing text).
    excerpt: firstText(article.excerpt),
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
    // article.notes (internal editor verdict reasoning) must never reach a
    // reader, even as a fallback -- excerpt has its own dedicated field
    // (metadata.excerpt) now, so this public-facing property is retired
    // rather than repurposed to carry it.
    notes: undefined,
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
      heroImageUrl: guardImageUrl(article.hero_image_url) || undefined,
      imagePrompts: article.image_prompts || undefined,
      imageAssets: article.image_assets?.map((asset) => ({ ...asset, url: guardImageUrl(asset.url) })) || undefined,
      infoCards: article.info_cards || undefined,
      editorialLens: article.editorial_lens || undefined,
      phugialyTake: article.phugialy_take || undefined,
      whatWedDo: article.what_wed_do || undefined,
      ...publicMetadata,
    },
  };
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

// `strict`: a database error is thrown instead of answered with an empty list.
// The cached readers below use it, so a failed read is never stored as "no
// articles" (which, cached, turned an outage into a blank site) and the last
// good copy keeps being served.
export async function getSupabaseArticles(status?: ArticleStatus, options: { strict?: boolean } = {}) {
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
  // Holiday buying guides stay out of every public reader of published
  // articles. Drafts are not filtered, so guides can still be reviewed in admin.
  if (status === "published") {
    query = query.not("tags", "cs", DEALS_TAG_JSON);
  }

  const { data, error } = await query.limit(1000);
  if (error) {
    console.error("Error fetching Supabase articles:", error);
    if (options.strict) throw new Error(`Supabase articles read failed: ${error.message}`);
    return [];
  }

  const rows = (data || []) as ArticleRow[];
  return (status === "published" ? withoutDealsGuides(rows) : rows).map((row) => toBlogPost(row));
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  return getSupabaseArticles("published");
}

// ---------------------------------------------------------------------------
// The article list, slimmed. The blog and home pages download every article, and
// the full read (content, raw_payload) was about 3.4 MB for 363 articles, redone
// from Supabase every 5 minutes: roughly a gigabyte a day, which is what used up
// the project's egress quota. The list only needs a teaser, so the body is cut to
// LIST_CONTENT_CHARS (the blog search looks at that much of it, plus the title,
// tags and summaries), the prompts and sources the cards never show are dropped,
// and the result is kept for 6 hours (publishing clears it at once, see
// revalidateArticles). The Next data cache refuses entries over 2 MB, so
// fitToCache shrinks it further if the library ever grows past that.
// ---------------------------------------------------------------------------

export const LIST_CONTENT_CHARS = 1500;
export const LIST_CACHE_LIMIT_BYTES = 1_800_000;

export function slimPostForList(post: BlogPost, contentChars: number = LIST_CONTENT_CHARS): BlogPost {
  const meta = post.metadata ?? {};
  const { sourceLinks: _sourceLinks, sourceQualityNote: _sourceQualityNote, ...kept } = meta;
  void _sourceLinks;
  void _sourceQualityNote;
  return {
    ...post,
    content: (post.content || "").slice(0, contentChars),
    metadata: {
      ...kept,
      // The cards read only the first prompt's alt text and the first info card.
      imagePrompts: meta.imagePrompts?.slice(0, 1).map((p) => ({ role: p.role, prompt: "", alt: p.alt })),
      infoCards: meta.infoCards?.slice(0, 1),
      imageAssets: meta.imageAssets?.map((a) => ({ role: a.role, url: a.url, alt: a.alt })),
    },
  };
}

/** Keeps a slimmed list under the data cache's size limit by shortening the bodies, then dropping them. */
export function fitToCache(posts: BlogPost[], limitBytes: number = LIST_CACHE_LIMIT_BYTES): BlogPost[] {
  const size = (list: BlogPost[]) => Buffer.byteLength(JSON.stringify(list), "utf8");
  let current = posts;
  for (const chars of [600, 200, 0]) {
    if (size(current) <= limitBytes) break;
    current = current.map((p) => ({ ...p, content: p.content.slice(0, chars) }));
  }
  return current;
}

async function loadListPosts(): Promise<BlogPost[]> {
  const rows = await getSupabaseArticles("published", { strict: true });
  return fitToCache(rows.map((post) => slimPostForList(post)));
}

const cachedListPosts = unstable_cache(loadListPosts, ["list-posts-v1"], {
  revalidate: 21600,
  tags: [ARTICLES_CACHE_TAG],
});

// A read that fails answers with an empty list for that one request. It is never
// cached (the cached readers throw on failure), so the next request tries again.
async function orEmpty<T>(label: string, read: () => Promise<T[]>): Promise<T[]> {
  try {
    return await read();
  } catch (error) {
    console.error(`Error reading ${label}:`, error);
    return [];
  }
}

/** For the list API: a failed read throws, so the last good response keeps being served. */
export function getAllPostsOrThrow(): Promise<BlogPost[]> {
  return cachedListPosts();
}

export function getAllPosts(): Promise<BlogPost[]> {
  return orEmpty("the article list", cachedListPosts);
}

/**
 * Lightweight version of getAllPosts for "related/recent/adjacent post"
 * sidebars: no content, no raw_payload (which drives the full metadata
 * derivation), so this is a fraction of the payload size of getAllPosts.
 */
async function loadSummaries(onlyGuides: boolean): Promise<BlogPost[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const base = supabase
    .from("articles")
    .select(
      "id, title, slug, tags, status, ai_summary, excerpt, publish_at, published_at, created_at, updated_at, portfolio_lane, hero_image_url, read_time, editorial_lens, phugialy_take, what_wed_do, rank_score"
    )
    .eq("status", "published");
  // The Articles readers never see holiday guides; the Deals pages see only them.
  const { data, error } = await (onlyGuides
    ? base.filter("tags", "cs", DEALS_TAG_JSON)
    : base.not("tags", "cs", DEALS_TAG_JSON))
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching article summaries:", error);
    throw new Error(`Supabase article summaries read failed: ${error.message}`);
  }

  const summaryRows = onlyGuides ? data || [] : withoutDealsGuides(data || []);

  return summaryRows.map((row) => ({
    _id: row.id,
    title: row.title,
    slug: row.slug,
    content: "",
    canonicalUrl: "",
    source: "supabase",
    tags: row.tags || [],
    // row.notes deliberately excluded -- internal editor verdict reasoning,
    // never reader-facing. This lightweight path skips full metadata
    // derivation (see doc comment above), so excerpt is the only safe
    // teaser source available here.
    notes: row.excerpt || undefined,
    status: row.status,
    publishDate: row.publish_at
      ? new Date(row.publish_at).getTime()
      : row.published_at
        ? new Date(row.published_at).getTime()
        : undefined,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
    metadata: {
      readTime: row.read_time ?? undefined,
      aiSummary: row.ai_summary || row.excerpt || undefined,
      portfolioLane: row.portfolio_lane || undefined,
      heroImageUrl: guardImageUrl(row.hero_image_url) || undefined,
      editorialLens: row.editorial_lens || undefined,
      phugialyTake: row.phugialy_take || undefined,
      whatWedDo: row.what_wed_do || undefined,
      rankScore: row.rank_score ?? undefined,
    },
  }));
}

// Every published article as a summary (~400 KB). Cached because the home
// page, every article page (related/recent/adjacent), the topic pages, the
// energy hub and the sitemap all read it -- uncached, each page view was a
// full ~400 KB read from Supabase, which is what drives egress.
const cachedSummaries = unstable_cache(() => loadSummaries(false), ["post-summaries-v3"], {
  revalidate: 900,
  tags: [ARTICLES_CACHE_TAG],
});
export function getPostSummaries(): Promise<BlogPost[]> {
  return orEmpty("article summaries", cachedSummaries);
}

// Published holiday buying guides only, for the Deals pages.
const cachedGuideSummaries = unstable_cache(() => loadSummaries(true), ["guide-summaries-v2"], {
  revalidate: 900,
  tags: [ARTICLES_CACHE_TAG],
});
export function getGuideSummaries(): Promise<BlogPost[]> {
  return orEmpty("guide summaries", cachedGuideSummaries);
}

// The 20 newest articles with full metadata, for the RSS feed only -- the
// feed used to run the full select("*") over every article to keep 20.
async function loadLatestPosts(limit: number): Promise<BlogPost[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .not("tags", "cs", DEALS_TAG_JSON)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest articles:", error);
    throw new Error(`Supabase latest articles read failed: ${error.message}`);
  }

  return withoutDealsGuides((data || []) as ArticleRow[]).map((row) => toBlogPost(row));
}

const cachedLatestPosts = unstable_cache(loadLatestPosts, ["latest-posts-v2"], {
  revalidate: 3600,
  tags: [ARTICLES_CACHE_TAG],
});
export function getLatestPosts(limit: number): Promise<BlogPost[]> {
  return orEmpty("the latest articles", () => cachedLatestPosts(limit));
}

export type ArticleLite = { id: string; title: string; slug: string };

/**
 * Lightweight list of every published article -- for pickers that need to
 * search/select an article without a full fetch (affiliate placements'
 * "add to article," Threads' "link to an article"). Fetched once and
 * filtered client-side by callers. Capped generously rather than tightly --
 * a tight cap on a fetch like this is exactly what silently broke /blog's
 * search earlier (this file's old .limit(100)).
 */
export async function listPublishedArticlesLite(): Promise<ArticleLite[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug")
    .eq("status", "published")
    .order("title", { ascending: true })
    .limit(1000);

  if (error) {
    throw error;
  }

  return (data || []) as ArticleLite[];
}

export async function getAllDrafts(): Promise<BlogPost[]> {
  return getSupabaseArticles();
}

// One article, read once per 10 minutes instead of on every view. Each article
// view used to read the same full row twice (once for the page, once for its
// metadata). Null means "no such article"; a database failure THROWS, so it is
// never cached as "not found" and is not shown to readers (or search engines)
// as a missing page. Publishing and editing clear it (revalidateArticles).
async function loadPost(slug: string): Promise<BlogPost | null> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase article read failed: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return toBlogPost(data as ArticleRow);
}

const cachedPost = unstable_cache(loadPost, ["post-by-slug-v1"], {
  revalidate: 600,
  tags: [ARTICLES_CACHE_TAG],
});

export function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return cachedPost(slug);
}

export async function incrementPostViews(slug: string, userAgent?: string | null): Promise<void> {
  if (isLikelyBot(userAgent)) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

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
  }
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

  revalidateArticles();
  return data;
}
