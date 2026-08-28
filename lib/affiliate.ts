import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";
import { inferPortfolioLane } from "@/lib/lanes";
import { isLikelyBot } from "@/lib/bot-detection";

export type AffiliateProduct = {
  id: string;
  name: string;
  brand: string | null;
  network: "amazon" | "other";
  category: string | null;
  tags: string[];
  description: string | null;
  image_url: string | null;
  affiliate_url: string;
  status: "active" | "inactive";
  promo_code: string | null;
  promo_details: string | null;
  buy_if: string | null;
  skip_if: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateProductInput = {
  name: string;
  brand?: string;
  network?: "amazon" | "other";
  category?: string;
  tags?: string[];
  description?: string;
  imageUrl?: string;
  affiliateUrl: string;
  status?: "active" | "inactive";
  promoCode?: string;
  promoDetails?: string;
  buyIf?: string;
  skipIf?: string;
};

export type AffiliateProductUpdate = Partial<{
  name: string;
  brand: string | null;
  network: "amazon" | "other";
  category: string | null;
  tags: string[];
  description: string | null;
  imageUrl: string | null;
  affiliateUrl: string;
  status: "active" | "inactive";
  promoCode: string | null;
  promoDetails: string | null;
  buyIf: string | null;
  skipIf: string | null;
}>;

export type ArticleAffiliateMatch = {
  id: string;
  article_id: string;
  product_id: string;
  match_score: number | null;
  match_reason: string | null;
  position: number;
  approved: boolean;
  is_active: boolean;
  context_note: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  affiliate_products: AffiliateProduct;
  articles: { title: string; slug: string } | null;
};

/**
 * Products shown on a published article page. Uses the anon/read client so
 * RLS ("status = active" / "approved = true") is the source of truth.
 */
export type ApprovedArticleProduct = AffiliateProduct & { context_note: string | null };

export async function getApprovedProductsForArticle(
  articleId: string
): Promise<ApprovedArticleProduct[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("position, context_note, affiliate_products(*)")
    .eq("article_id", articleId)
    .eq("approved", true)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching affiliate matches:", error);
    return [];
  }

  return (data || [])
    .map((row) => {
      const product = row.affiliate_products as unknown as AffiliateProduct | null;
      if (!product) return null;
      return { ...product, context_note: row.context_note as string | null };
    })
    .filter(
      (product): product is ApprovedArticleProduct =>
        product !== null && product.status === "active"
    )
    // Up to 3 Picks can display per article -- the admin still controls the
    // actual count via approval (this is a ceiling, not a target). Raised
    // from a hard cap of 1 once the Picks reframe (buy_if/skip_if,
    // context_note) made multiple recommendations on one page read as
    // curated decisions rather than an ad stack. Cap here, the single
    // source of truth both display call sites read from, rather than
    // trusting every caller to remember the limit.
    .slice(0, 3);
}

export async function logAffiliateClick(params: {
  productId: string;
  articleSlug?: string;
  referrer?: string;
  userAgent?: string;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from("affiliate_clicks").insert({
    product_id: params.productId,
    article_slug: params.articleSlug || null,
    referrer: params.referrer || null,
    user_agent: params.userAgent || null,
    is_bot: isLikelyBot(params.userAgent),
  });
}

/**
 * One row per time a Pick card actually renders on a page -- lets CTR
 * (clicks / impressions) be computed per product/article instead of only
 * knowing click volume in isolation. Same bot-filtering as clicks, same
 * fire-and-forget call pattern as incrementPostViews.
 */
export async function logAffiliateImpression(params: {
  productId: string;
  articleSlug?: string;
  userAgent?: string;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from("affiliate_impressions").insert({
    product_id: params.productId,
    article_slug: params.articleSlug || null,
    is_bot: isLikelyBot(params.userAgent),
  });
}

export async function getActiveAffiliateProduct(id: string): Promise<AffiliateProduct | null> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AffiliateProduct;
}

/**
 * Admin-safe single-product lookup -- no status filter, unlike
 * getActiveAffiliateProduct, since the product detail page needs to load
 * and edit an inactive product too.
 */
export async function getAffiliateProductById(id: string): Promise<AffiliateProduct | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AffiliateProduct;
}

// --- Resource discovery (/resources) ---

/**
 * All active products for the public /resources page. Uses the anon/read
 * client so RLS ("status = active") stays the source of truth, same as
 * getApprovedProductsForArticle.
 */
export async function listActiveResources(): Promise<AffiliateProduct[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("status", "active")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing active resources:", error);
    return [];
  }

  return (data || []) as AffiliateProduct[];
}

/**
 * Articles that reference a given resource, for the detail page's
 * "referenced in" cross-navigation. Only approved matches — mirrors what
 * the public article page itself is allowed to show.
 */
export async function getArticlesForResource(
  productId: string
): Promise<Array<{ title: string; slug: string }>> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("articles(title, slug)")
    .eq("product_id", productId)
    .eq("approved", true);

  if (error) {
    console.error("Error fetching articles for resource:", error);
    return [];
  }

  return (data || [])
    .map((row) => row.articles as unknown as { title: string; slug: string } | null)
    .filter((article): article is { title: string; slug: string } => Boolean(article));
}

/**
 * Other active resources in the same category, for "related resources" on
 * a detail page. Category is a free-text admin field today (no fixed
 * taxonomy yet) — exact match is intentional; revisit once the catalog is
 * large enough to need fuzzier grouping.
 */
export async function getRelatedResources(product: AffiliateProduct): Promise<AffiliateProduct[]> {
  if (!product.category) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("status", "active")
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(4);

  if (error) {
    console.error("Error fetching related resources:", error);
    return [];
  }

  return (data || []) as AffiliateProduct[];
}

// --- Admin: click analytics ---

export type AffiliateClickStats = {
  totalClicks: number;
  totalImpressions: number;
  byProduct: Array<{
    productId: string;
    productName: string;
    network: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    lastClickAt: string;
  }>;
  byArticle: Array<{
    articleSlug: string;
    articleTitle: string | null;
    clicks: number;
    impressions: number;
    ctr: number | null;
    lastClickAt: string;
  }>;
  recent: Array<{
    id: string;
    productName: string;
    articleSlug: string | null;
    articleTitle: string | null;
    createdAt: string;
  }>;
  // Crawler/bot hits on the same redirect endpoint -- tracked separately
  // rather than discarded, since crawler activity is its own useful signal,
  // but kept out of totalClicks/byProduct/byArticle/recent above.
  botTotal: number;
  botRecent: Array<{
    id: string;
    productName: string;
    articleSlug: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
};

/**
 * Aggregated from the raw affiliate_clicks log (written server-side by the
 * /api/affiliate/go redirect on every outbound click). Aggregation happens
 * in JS rather than SQL since PostgREST has no GROUP BY -- fine at current
 * volume; revisit with an RPC if the click log grows large.
 */
export async function getAffiliateClickStats(): Promise<AffiliateClickStats> {
  const empty: AffiliateClickStats = {
    totalClicks: 0,
    totalImpressions: 0,
    byProduct: [],
    byArticle: [],
    recent: [],
    botTotal: 0,
    botRecent: [],
  };

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return empty;
  }

  const [clicksRes, impressionsRes] = await Promise.all([
    supabase
      .from("affiliate_clicks")
      .select("id, product_id, article_slug, created_at, user_agent, is_bot, affiliate_products(name, network)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("affiliate_impressions")
      .select("product_id, article_slug")
      .eq("is_bot", false)
      .limit(5000),
  ]);

  if (clicksRes.error || !clicksRes.data) {
    console.error("Error fetching affiliate click stats:", clicksRes.error);
    return empty;
  }
  if (impressionsRes.error) {
    console.error("Error fetching affiliate impression stats:", impressionsRes.error);
  }

  const allRows = clicksRes.data;
  const impressionRows = impressionsRes.data || [];

  const impressionsByProduct = new Map<string, number>();
  const impressionsByArticle = new Map<string, number>();
  for (const row of impressionRows) {
    if (row.product_id) {
      impressionsByProduct.set(row.product_id, (impressionsByProduct.get(row.product_id) || 0) + 1);
    }
    if (row.article_slug) {
      impressionsByArticle.set(row.article_slug, (impressionsByArticle.get(row.article_slug) || 0) + 1);
    }
  }

  const botRows = allRows.filter((row) => row.is_bot);
  const clicks = allRows.filter((row) => !row.is_bot);

  const slugs = Array.from(
    new Set(clicks.map((c) => c.article_slug).filter((s): s is string => Boolean(s)))
  );
  const titleBySlug = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: articles } = await supabase.from("articles").select("slug, title").in("slug", slugs);
    for (const article of articles || []) {
      titleBySlug.set(article.slug, article.title);
    }
  }

  const byProduct = new Map<
    string,
    { productName: string; network: string; clicks: number; lastClickAt: string }
  >();
  const byArticle = new Map<string, { articleTitle: string | null; clicks: number; lastClickAt: string }>();

  // clicks is already newest-first, so the first time we see a key its
  // created_at is the most recent click for that key.
  for (const click of clicks) {
    const product = click.affiliate_products as unknown as { name: string; network: string } | null;

    if (click.product_id) {
      const existing = byProduct.get(click.product_id);
      if (existing) {
        existing.clicks += 1;
      } else {
        byProduct.set(click.product_id, {
          productName: product?.name || "Deleted product",
          network: product?.network || "other",
          clicks: 1,
          lastClickAt: click.created_at,
        });
      }
    }

    if (click.article_slug) {
      const existing = byArticle.get(click.article_slug);
      if (existing) {
        existing.clicks += 1;
      } else {
        byArticle.set(click.article_slug, {
          articleTitle: titleBySlug.get(click.article_slug) || null,
          clicks: 1,
          lastClickAt: click.created_at,
        });
      }
    }
  }

  return {
    totalClicks: clicks.length,
    totalImpressions: impressionRows.length,
    byProduct: Array.from(byProduct.entries())
      .map(([productId, v]) => {
        const impressions = impressionsByProduct.get(productId) || 0;
        return { productId, ...v, impressions, ctr: impressions > 0 ? v.clicks / impressions : null };
      })
      .sort((a, b) => b.clicks - a.clicks),
    byArticle: Array.from(byArticle.entries())
      .map(([articleSlug, v]) => {
        const impressions = impressionsByArticle.get(articleSlug) || 0;
        return { articleSlug, ...v, impressions, ctr: impressions > 0 ? v.clicks / impressions : null };
      })
      .sort((a, b) => b.clicks - a.clicks),
    recent: clicks.slice(0, 20).map((c) => ({
      id: c.id,
      productName:
        (c.affiliate_products as unknown as { name: string } | null)?.name || "Deleted product",
      articleSlug: c.article_slug,
      articleTitle: c.article_slug ? titleBySlug.get(c.article_slug) || null : null,
      createdAt: c.created_at,
    })),
    botTotal: botRows.length,
    botRecent: botRows.slice(0, 20).map((c) => ({
      id: c.id,
      productName:
        (c.affiliate_products as unknown as { name: string } | null)?.name || "Deleted product",
      articleSlug: c.article_slug,
      userAgent: c.user_agent,
      createdAt: c.created_at,
    })),
  };
}

// --- Admin: catalog management ---

export async function listAffiliateProducts(): Promise<AffiliateProduct[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as AffiliateProduct[];
}

export async function createAffiliateProduct(input: AffiliateProductInput) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .insert({
      name: input.name,
      brand: input.brand || null,
      network: input.network || "other",
      category: input.category || null,
      tags: input.tags || [],
      description: input.description || null,
      image_url: input.imageUrl || null,
      affiliate_url: input.affiliateUrl,
      status: input.status || "active",
      promo_code: input.promoCode || null,
      promo_details: input.promoDetails || null,
      buy_if: input.buyIf || null,
      skip_if: input.skipIf || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AffiliateProduct;
}

/**
 * Generalizes setAffiliateProductStatus to any editable field, for the
 * product detail page's edit form (name, promo code, etc). Status-only
 * callers (the By Product list toggle) keep using
 * setAffiliateProductStatus below rather than switching to this.
 */
export async function updateAffiliateProduct(id: string, fields: AffiliateProductUpdate) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.brand !== undefined) update.brand = fields.brand;
  if (fields.network !== undefined) update.network = fields.network;
  if (fields.category !== undefined) update.category = fields.category;
  if (fields.tags !== undefined) update.tags = fields.tags;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.imageUrl !== undefined) update.image_url = fields.imageUrl;
  if (fields.affiliateUrl !== undefined) update.affiliate_url = fields.affiliateUrl;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.promoCode !== undefined) update.promo_code = fields.promoCode;
  if (fields.promoDetails !== undefined) update.promo_details = fields.promoDetails;
  if (fields.buyIf !== undefined) update.buy_if = fields.buyIf;
  if (fields.skipIf !== undefined) update.skip_if = fields.skipIf;

  const { data, error } = await supabase
    .from("affiliate_products")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AffiliateProduct;
}

export async function setAffiliateProductStatus(id: string, status: "active" | "inactive") {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("affiliate_products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// --- Admin: match review queue ---

export async function listPendingMatches(): Promise<ArticleAffiliateMatch[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("*, affiliate_products(*), articles(title, slug)")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as unknown as ArticleAffiliateMatch[];
}

/**
 * Every match row, pending and approved -- the by-article/by-product admin
 * views need the full picture (what's live alongside what's still queued)
 * rather than just the review queue listPendingMatches gives.
 */
export async function listAllMatches(): Promise<ArticleAffiliateMatch[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("*, affiliate_products(*), articles(title, slug)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as unknown as ArticleAffiliateMatch[];
}

export async function approveMatch(id: string, approvedBy: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("article_affiliate_products")
    .update({
      approved: true,
      is_active: true,
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function rejectMatch(id: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase.from("article_affiliate_products").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Deactivate (or reactivate) a live match without deleting it -- history
 * (score, reason, who originally approved it) stays intact so it can be
 * turned back on later without re-running the matcher. Distinct from
 * rejectMatch, which is a permanent removal.
 */
export async function setMatchActive(id: string, isActive: boolean) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("article_affiliate_products")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Per-placement note on why this asset is recommended on this specific
 * article -- distinct from a product-level field since the same asset can
 * be placed on different articles for different reasons. Renders publicly
 * as "Recommended for: {note}" on the Pick card.
 */
export async function setPlacementContextNote(id: string, note: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("article_affiliate_products")
    .update({ context_note: note })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Admin picks a product for an article the matcher didn't suggest (or
 * re-adds one it previously deactivated). Pre-approved -- a manual pick by
 * the site owner doesn't need a second review step. Upserts on the same
 * (article_id, product_id) unique constraint resource-discovery.ts already
 * relies on, so re-adding a deactivated pairing reactivates it instead of
 * hitting a conflict error.
 */
export async function addManualMatch(params: {
  articleId: string;
  productId: string;
  approvedBy: string;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase.from("article_affiliate_products").upsert(
    {
      article_id: params.articleId,
      product_id: params.productId,
      approved: true,
      is_active: true,
      approved_at: new Date().toISOString(),
      approved_by: params.approvedBy,
      match_score: null,
      match_reason: "Manually added",
      position: 0,
    },
    { onConflict: "article_id,product_id" }
  );

  if (error) {
    throw error;
  }
}

/**
 * Every match row for one product, for the product detail page's "which
 * articles is this attached to" view.
 */
export async function getMatchesForProduct(productId: string): Promise<ArticleAffiliateMatch[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("*, affiliate_products(*), articles(title, slug)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as unknown as ArticleAffiliateMatch[];
}

// --- Matcher cron ---

// Every uncovered article gets its best available options surfaced for
// review -- up to 4 ranked candidates, even a weak one, rather than
// silently getting nothing. There's no hard score floor for inclusion
// anymore: the human approval gate is what protects quality, and a ranked
// shortlist with visible confidence is more useful to review than a single
// auto-picked "best" match that may not exist. Nothing here changes what
// goes live -- only what gets proposed for review.
const MAX_CANDIDATES_PER_ARTICLE = 4;
// Cap how many articles get processed per run. With ~170+ uncovered
// articles and up to 4 candidates each, running unbounded would dump
// hundreds of rows into the queue in one shot -- unreviewable. This grows
// the queue gradually instead (run daily, ~30/day clears the backlog in
// about a week without any single day's review batch getting unmanageable).
const MAX_ARTICLES_PER_RUN = 30;
// No single product should dominate the approval queue — if one vendor is
// already heavily represented among pending+approved matches, deprioritize it
// so the catalog doesn't read as a single-vendor endorsement.
const MAX_SHARE_PER_PRODUCT = 0.2;

const STOPWORDS = new Set([
  "and", "the", "for", "with", "your", "you", "of", "in", "on", "to", "a", "an", "is", "are",
]);

// Curated lane -> product-category affinity, replacing a substring check
// that compared lane names ("AI Advancement") against category strings
// ("Keyboards") and could never match anything -- confirmed empirically
// (0 lane-match hits across all 180 articles x 31 products before this).
// DFW Commercial Projects + Sales is intentionally excluded: it's not an
// AI-content lane and has no catalog overlap.
// Built from real tag/title frequency across the article corpus, not
// guessed: "engineering"/"learning"/"machine"/"development"/"research"
// each appear on 15-50 articles (strong -> AI Engineering books), while
// "local"/"edge"/"gpu"/"inference"/"coding"/"programming" each appear on
// only 2-5 (thin but real -> AI Hardware / coding-workstation gear).
export const LANE_CATEGORIES: Record<string, string[]> = {
  "AI Advancement": ["AI Engineering", "AI Hardware"],
  "Applied AI": ["AI Engineering", "AI Hardware"],
  "How-to-AI": ["AI Engineering", "AI Hardware"],
  "Vibe-coding / Codex": [
    "AI Engineering",
    "AI Hardware",
    "Keyboards",
    "Monitors",
    "Input Devices",
    "Docking & Hubs",
  ],
};

function significantWords(tag: string): Set<string> {
  return new Set(
    tag
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      // "ai" is short but is the single most relevant connecting word for
      // the AI Hardware/AI Engineering side of the catalog -- the general
      // length filter was silently dropping it before any comparison ran.
      .filter((word) => (word.length > 2 || word === "ai") && !STOPWORDS.has(word))
  );
}

function scoreMatch(
  articleTags: string[],
  articleLane: string | null,
  product: { tags: string[]; category: string | null }
) {
  const articleTagSet = new Set(articleTags.map((t) => t.toLowerCase()));
  const articleWordSet = new Set(articleTags.flatMap((t) => [...significantWords(t)]));

  const exactMatches = product.tags.filter((tag) => articleTagSet.has(tag.toLowerCase()));

  // Partial/fuzzy credit: "LLM Agents" and "AI Agents" share the word
  // "agents" even though the full tags don't match exactly. Weighted lower
  // than an exact tag match since it's a weaker signal.
  const fuzzyMatches = new Set<string>();
  for (const tag of product.tags) {
    if (articleTagSet.has(tag.toLowerCase())) continue;
    for (const word of significantWords(tag)) {
      if (articleWordSet.has(word)) {
        fuzzyMatches.add(word);
      }
    }
  }

  let score = exactMatches.length * 1 + fuzzyMatches.size * 0.4;

  const category = product.category || "";
  const laneMatches = Boolean(
    articleLane &&
      category &&
      (LANE_CATEGORIES[articleLane] || []).some(
        (allowed) => allowed.toLowerCase() === category.toLowerCase()
      )
  );
  if (laneMatches) {
    score += 1.5;
  }

  return {
    score: Math.round(score * 10) / 10,
    exactMatches,
    fuzzyMatches: [...fuzzyMatches],
    laneMatches,
  };
}

function describeMatch(
  exactMatches: string[],
  fuzzyMatches: string[],
  laneMatches: boolean,
  lane: string | null,
  score: number
) {
  const reasons: string[] = [];
  if (exactMatches.length > 0) {
    reasons.push(`shares tag${exactMatches.length > 1 ? "s" : ""} ${exactMatches.join(", ")}`);
  }
  if (fuzzyMatches.length > 0) {
    reasons.push(`related terms: ${fuzzyMatches.join(", ")}`);
  }
  if (laneMatches && lane) {
    reasons.push(`matches the ${lane} lane`);
  }

  if (reasons.length === 0) {
    return "No strong signal in this catalog -- closest available option. Review carefully before approving.";
  }

  const prefix = score >= 2 ? "Strong match" : "Possible fit";
  return `${prefix}: ${reasons.join("; ")}`;
}

export async function matchAffiliateProducts() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: products, error: productsError } = await supabase
    .from("affiliate_products")
    .select("id, tags, category")
    .eq("status", "active");

  if (productsError) {
    throw productsError;
  }

  if (!products || products.length === 0) {
    return { matched: 0, articlesProcessed: 0 };
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane")
    .eq("status", "published")
    .limit(200);

  if (articlesError) {
    throw articlesError;
  }

  const { data: existingMatches, error: existingError } = await supabase
    .from("article_affiliate_products")
    .select("article_id");

  if (existingError) {
    throw existingError;
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMatches, error: recentError } = await supabase
    .from("article_affiliate_products")
    .select("product_id")
    .gte("created_at", ninetyDaysAgo);

  if (recentError) {
    throw recentError;
  }

  const productShareCount = new Map<string, number>();
  for (const row of recentMatches || []) {
    productShareCount.set(row.product_id, (productShareCount.get(row.product_id) || 0) + 1);
  }
  const totalRecentMatches = recentMatches?.length || 0;

  function exceedsVendorConcentration(productId: string) {
    // Only start enforcing once there's a meaningful sample size — a cold
    // catalog shouldn't block its first few matches.
    if (totalRecentMatches < 5) return false;
    const currentShare = (productShareCount.get(productId) || 0) / totalRecentMatches;
    return currentShare >= MAX_SHARE_PER_PRODUCT;
  }

  const alreadyMatched = new Set((existingMatches || []).map((row) => row.article_id));
  const candidates = (articles || [])
    .filter((article) => !alreadyMatched.has(article.id))
    .slice(0, MAX_ARTICLES_PER_RUN);

  let matched = 0;

  for (const article of candidates) {
    // Falls back to the same keyword inference getArticleLane() uses for
    // display -- portfolio_lane is only set on ~8% of published articles,
    // so reading it directly left the lane-match bonus dead for the rest.
    const lane = inferPortfolioLane(article.portfolio_lane, article.tags, article.title);
    const scored = products
      .map((product) => {
        const result = scoreMatch(article.tags || [], lane, {
          tags: product.tags || [],
          category: product.category,
        });
        return { product, ...result };
      })
      .filter((entry) => !exceedsVendorConcentration(entry.product.id))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Every active product is over its vendor-concentration cap right now.
      continue;
    }

    // Surface every candidate with real signal, up to the cap. If nothing
    // has any signal at all, still propose the single least-bad option
    // rather than leaving the article with zero attempts -- clearly labeled
    // as low-confidence via describeMatch so it's easy to reject on sight.
    const withSignal = scored.filter((entry) => entry.score > 0);
    const chosen =
      withSignal.length > 0 ? withSignal.slice(0, MAX_CANDIDATES_PER_ARTICLE) : scored.slice(0, 1);

    const rows = chosen.map((entry, index) => ({
      article_id: article.id,
      product_id: entry.product.id,
      match_score: entry.score,
      match_reason: describeMatch(entry.exactMatches, entry.fuzzyMatches, entry.laneMatches, lane, entry.score),
      position: index,
      approved: false,
    }));

    const { error: insertError } = await supabase
      .from("article_affiliate_products")
      .upsert(rows, { onConflict: "article_id,product_id", ignoreDuplicates: true });

    if (insertError) {
      console.error("Error inserting affiliate matches:", insertError);
      continue;
    }

    for (const row of rows) {
      productShareCount.set(row.product_id, (productShareCount.get(row.product_id) || 0) + 1);
    }
    matched += rows.length;
  }

  return { matched, articlesProcessed: candidates.length };
}
