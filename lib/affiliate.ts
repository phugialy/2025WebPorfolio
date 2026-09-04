import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";
import { inferPortfolioLane } from "@/lib/lanes";
import { isLikelyBot } from "@/lib/bot-detection";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

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

// Supabase/PostgREST projects cap any single response at a server-side
// max-rows setting (1000 by default) regardless of what `.limit()` a query
// requests -- confirmed live: `.limit(5000)` on affiliate_impressions was
// silently returning exactly 1000 rows while the real total was 2,582.
// Paginating with `.range()` in PAGE_SIZE chunks gets the true full set
// regardless of that ceiling, and keeps working if it's ever raised or
// lowered on the project.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return allRows;
}

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

  type ClickRow = {
    id: string;
    product_id: string | null;
    article_slug: string | null;
    created_at: string;
    user_agent: string | null;
    is_bot: boolean;
    // Supabase's inferred join shape doesn't match a clean single-object
    // type here -- downstream code already casts this via `as unknown as`,
    // same as before this function was touched.
    affiliate_products: unknown;
  };
  type ImpressionRow = { product_id: string | null; article_slug: string | null };

  let allRows: ClickRow[];
  let impressionRows: ImpressionRow[];

  try {
    [allRows, impressionRows] = await Promise.all([
      fetchAllRows<ClickRow>((from, to) =>
        supabase
          .from("affiliate_clicks")
          .select("id, product_id, article_slug, created_at, user_agent, is_bot, affiliate_products(name, network)")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllRows<ImpressionRow>((from, to) =>
        supabase
          .from("affiliate_impressions")
          .select("product_id, article_slug")
          .eq("is_bot", false)
          .range(from, to)
      ),
    ]);
  } catch (error) {
    console.error("Error fetching affiliate click stats:", error);
    return empty;
  }

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

  const product = data as AffiliateProduct;

  // A product created directly as active has already cleared the one
  // judgment call that matters (is this worth ever recommending) -- push it
  // out to fitting articles immediately instead of waiting for it to be
  // discovered by the next scheduled backlog run.
  if (product.status === "active") {
    // Awaited, not fire-and-forget: a serverless function can be frozen the
    // instant it returns a response, so unawaited background work here is
    // not guaranteed to ever finish.
    try {
      await matchArticlesForProduct(product.id);
    } catch (err) {
      console.error("Auto-match on product create failed:", err);
    }
  }

  return product;
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

  // Only needed to detect an active/inactive transition below -- one extra
  // read on an infrequent admin action, not worth avoiding.
  const previousStatus =
    fields.status !== undefined ? (await getAffiliateProductById(id))?.status : undefined;

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

  const product = data as AffiliateProduct;

  if (fields.status !== undefined && previousStatus && previousStatus !== fields.status) {
    try {
      if (fields.status === "active") {
        // The product just cleared its one manual review -- push it out to
        // fitting articles now instead of waiting for a scheduled sweep.
        await matchArticlesForProduct(id);
      } else {
        // Going inactive can orphan any article whose only visible Pick was
        // this product -- repair those immediately rather than leaving them
        // empty until a later cron happens to check.
        await repairOrphansForProduct(id);
      }
    } catch (err) {
      console.error(`Auto-match on product ${fields.status} failed:`, err);
    }
  }

  return product;
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
// A match at or above this score is what describeMatch already calls a
// "Strong match" -- the two-gate model splits on it: product.status=active is
// still a manual, one-time review of the product itself, but a strong match
// against an already-vetted product no longer needs a second per-article
// sign-off. Weaker/ambiguous matches still land in the review queue
// (approved=false) since that's exactly the case human judgment is for.
const AUTO_APPROVE_SCORE_THRESHOLD = 2;
const AUTO_APPROVE_ACTOR = "system:auto-match";
// Bound on how many published articles one newly-activated product gets
// tested against in a single run -- cheap in-memory scoring, but still a
// sensible ceiling so activating one product can't scan an unbounded catalog.
const MAX_ARTICLES_PER_PRODUCT_RUN = 60;
// Strong matches (>= AUTO_APPROVE_SCORE_THRESHOLD) flow through uncapped --
// genuine breadth is a good outcome. Weak/ambiguous matches still need human
// review, so this caps how many of those one product activation can dump
// into the queue at once (confirmed necessary empirically: a single
// broad-tag book scored a nonzero fuzzy hit against 54 of 60 candidate
// articles in testing).
const MAX_PENDING_CANDIDATES_PER_PRODUCT_RUN = 10;

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

  // Ordered newest-first: with no ordering, `.slice(0, MAX_ARTICLES_PER_RUN)`
  // below took whatever arbitrary order Postgres happened to return, so a
  // brand-new article had no priority over a large backlog of older
  // uncovered articles and could go days without a match purely by chance.
  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
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

    const rows = chosen.map((entry, index) => {
      const approved = entry.score >= AUTO_APPROVE_SCORE_THRESHOLD;
      return {
        article_id: article.id,
        product_id: entry.product.id,
        match_score: entry.score,
        match_reason: describeMatch(entry.exactMatches, entry.fuzzyMatches, entry.laneMatches, lane, entry.score),
        position: index,
        approved,
        ...(approved
          ? { approved_at: new Date().toISOString(), approved_by: AUTO_APPROVE_ACTOR }
          : {}),
      };
    });

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

/**
 * Same vendor-concentration guard matchAffiliateProducts computes inline,
 * pulled out so the two event-driven matchers below and orphan repair can
 * share one freshly-computed view of "how much of the recent match volume
 * does this product already own" instead of duplicating the query.
 */
async function computeVendorConcentration(supabase: AdminClient) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMatches, error } = await supabase
    .from("article_affiliate_products")
    .select("product_id")
    .gte("created_at", ninetyDaysAgo);

  if (error) {
    throw error;
  }

  const productShareCount = new Map<string, number>();
  for (const row of recentMatches || []) {
    productShareCount.set(row.product_id, (productShareCount.get(row.product_id) || 0) + 1);
  }
  const total = recentMatches?.length || 0;

  return {
    exceeds(productId: string) {
      if (total < 5) return false;
      return (productShareCount.get(productId) || 0) / total >= MAX_SHARE_PER_PRODUCT;
    },
    record(productId: string) {
      productShareCount.set(productId, (productShareCount.get(productId) || 0) + 1);
    },
  };
}

// --- Event-driven matching (Workflow 1: new article -> products) ---

/**
 * Matches one just-published article against the active catalog. Called
 * directly from publishDueArticles right after an article goes live, so a
 * brand-new article gets its Picks the same moment it publishes instead of
 * waiting for the next scheduled backlog run to reach it.
 */
export async function matchProductsForArticle(articleId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane")
    .eq("id", articleId)
    .maybeSingle();

  if (articleError) {
    throw articleError;
  }
  if (!article) {
    return { matched: 0 };
  }

  const { data: products, error: productsError } = await supabase
    .from("affiliate_products")
    .select("id, tags, category")
    .eq("status", "active");

  if (productsError) {
    throw productsError;
  }
  if (!products || products.length === 0) {
    return { matched: 0 };
  }

  const concentration = await computeVendorConcentration(supabase);
  const lane = inferPortfolioLane(article.portfolio_lane, article.tags, article.title);

  const scored = products
    .map((product) => ({
      product,
      ...scoreMatch(article.tags || [], lane, { tags: product.tags || [], category: product.category }),
    }))
    .filter((entry) => !concentration.exceeds(entry.product.id))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: 0 };
  }

  const withSignal = scored.filter((entry) => entry.score > 0);
  const chosen =
    withSignal.length > 0 ? withSignal.slice(0, MAX_CANDIDATES_PER_ARTICLE) : scored.slice(0, 1);

  const rows = chosen.map((entry, index) => {
    const approved = entry.score >= AUTO_APPROVE_SCORE_THRESHOLD;
    return {
      article_id: article.id,
      product_id: entry.product.id,
      match_score: entry.score,
      match_reason: describeMatch(entry.exactMatches, entry.fuzzyMatches, entry.laneMatches, lane, entry.score),
      position: index,
      approved,
      ...(approved
        ? { approved_at: new Date().toISOString(), approved_by: AUTO_APPROVE_ACTOR }
        : {}),
    };
  });

  const { error: insertError } = await supabase
    .from("article_affiliate_products")
    .upsert(rows, { onConflict: "article_id,product_id", ignoreDuplicates: true });

  if (insertError) {
    throw insertError;
  }

  return { matched: rows.length };
}

// --- Event-driven matching (Workflow 2: product activated -> articles) ---

/**
 * Matches one newly-activated product against the published catalog. Called
 * from updateAffiliateProduct/createAffiliateProduct the moment a product
 * becomes active, so it reaches every article it fits without waiting to be
 * picked up by a scheduled sweep.
 */
export async function matchArticlesForProduct(productId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: product, error: productError } = await supabase
    .from("affiliate_products")
    .select("id, tags, category, status")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    throw productError;
  }
  if (!product || product.status !== "active") {
    return { matched: 0, articlesProcessed: 0 };
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (articlesError) {
    throw articlesError;
  }
  if (!articles || articles.length === 0) {
    return { matched: 0, articlesProcessed: 0 };
  }

  const concentration = await computeVendorConcentration(supabase);
  const candidates = articles.slice(0, MAX_ARTICLES_PER_PRODUCT_RUN);

  // Position needs to append after whatever's already approved on each
  // article, not collide at 0 -- an article can carry up to 3 live Picks,
  // and this product is very likely joining an article that already has one.
  const { data: existingApproved, error: existingError } = await supabase
    .from("article_affiliate_products")
    .select("article_id")
    .in(
      "article_id",
      candidates.map((a) => a.id)
    )
    .eq("approved", true);

  if (existingError) {
    throw existingError;
  }

  const positionByArticle = new Map<string, number>();
  for (const row of existingApproved || []) {
    positionByArticle.set(row.article_id, (positionByArticle.get(row.article_id) || 0) + 1);
  }

  // Score every candidate first, rather than inserting as we go. A product
  // with a broad/generic tag (e.g. "AI") can score a nonzero fuzzy-word hit
  // against nearly every article in the corpus -- scoring up front lets the
  // strong tier flow through uncapped (genuine breadth is fine) while the
  // weak tier gets floored and capped below, instead of dumping dozens of
  // near-noise rows into the review queue.
  const scored = candidates
    .map((article) => {
      const lane = inferPortfolioLane(article.portfolio_lane, article.tags, article.title);
      const result = scoreMatch(article.tags || [], lane, {
        tags: product.tags || [],
        category: product.category,
      });
      return { article, lane, ...result };
    })
    .filter((entry) => entry.score > 0);

  const strong = scored.filter((entry) => entry.score >= AUTO_APPROVE_SCORE_THRESHOLD);
  // A lone fuzzy hit on one generic word (e.g. just "ai") scores 0.4 and
  // matches almost anything -- not worth a human's attention. Only a
  // genuinely closer partial fit earns a spot in the (small, capped) review
  // queue.
  const weak = scored
    .filter((entry) => entry.score > 0.4 && entry.score < AUTO_APPROVE_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PENDING_CANDIDATES_PER_PRODUCT_RUN);

  const rows: Array<Record<string, unknown>> = [];

  for (const entry of [...strong, ...weak]) {
    if (concentration.exceeds(productId)) {
      // This product has hit its share of recent matches mid-run -- stop
      // rather than keep attaching it past the vendor-concentration cap.
      break;
    }

    const approved = entry.score >= AUTO_APPROVE_SCORE_THRESHOLD;
    rows.push({
      article_id: entry.article.id,
      product_id: product.id,
      match_score: entry.score,
      match_reason: describeMatch(entry.exactMatches, entry.fuzzyMatches, entry.laneMatches, entry.lane, entry.score),
      position: positionByArticle.get(entry.article.id) || 0,
      approved,
      ...(approved
        ? { approved_at: new Date().toISOString(), approved_by: AUTO_APPROVE_ACTOR }
        : {}),
    });
    positionByArticle.set(entry.article.id, (positionByArticle.get(entry.article.id) || 0) + 1);
    concentration.record(productId);
  }

  if (rows.length === 0) {
    return { matched: 0, articlesProcessed: candidates.length };
  }

  const { error: insertError } = await supabase
    .from("article_affiliate_products")
    .upsert(rows, { onConflict: "article_id,product_id", ignoreDuplicates: true });

  if (insertError) {
    throw insertError;
  }

  return { matched: rows.length, articlesProcessed: candidates.length };
}

// --- Orphan repair (product goes inactive, or a periodic safety sweep) ---

type OrphanCandidateArticle = {
  id: string;
  title: string;
  tags: string[];
  portfolio_lane: string | null;
};

/**
 * An article is "orphaned" if none of its approved+active matches point at a
 * currently-active product -- i.e. getApprovedProductsForArticle would
 * render nothing. Scoped to candidateArticleIds when only a specific set
 * needs checking (a product just went inactive); omitted for the full
 * periodic sweep.
 */
async function findOrphanedArticles(
  supabase: AdminClient,
  candidateArticleIds?: string[]
): Promise<OrphanCandidateArticle[]> {
  let query = supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane")
    .eq("status", "published");
  if (candidateArticleIds) {
    query = query.in("id", candidateArticleIds);
  }

  const { data: articles, error } = await query;
  if (error) {
    throw error;
  }
  if (!articles || articles.length === 0) {
    return [];
  }

  const { data: visibleRows, error: visibleError } = await supabase
    .from("article_affiliate_products")
    .select("article_id, affiliate_products(status)")
    .eq("approved", true)
    .eq("is_active", true)
    .in(
      "article_id",
      articles.map((a) => a.id)
    );

  if (visibleError) {
    throw visibleError;
  }

  const covered = new Set<string>();
  for (const row of visibleRows || []) {
    const product = row.affiliate_products as unknown as { status: string } | null;
    if (product?.status === "active") {
      covered.add(row.article_id as string);
    }
  }

  return (articles as OrphanCandidateArticle[]).filter((a) => !covered.has(a.id));
}

/**
 * One repair attempt per orphaned article against the current active
 * catalog -- deliberately not a full re-optimization pass. If nothing scores
 * above zero, the article is left with no Pick section rather than filled
 * with an irrelevant placeholder; that's a deliberate choice, not a gap.
 */
async function repairOrphanedArticles(supabase: AdminClient, orphans: OrphanCandidateArticle[]) {
  if (orphans.length === 0) {
    return { repaired: 0, stillOrphaned: 0 };
  }

  const { data: products, error: productsError } = await supabase
    .from("affiliate_products")
    .select("id, tags, category")
    .eq("status", "active");

  if (productsError) {
    throw productsError;
  }
  if (!products || products.length === 0) {
    return { repaired: 0, stillOrphaned: orphans.length };
  }

  const concentration = await computeVendorConcentration(supabase);
  const rows: Array<Record<string, unknown>> = [];

  for (const article of orphans) {
    const lane = inferPortfolioLane(article.portfolio_lane, article.tags, article.title);
    const best = products
      .map((product) => ({
        product,
        ...scoreMatch(article.tags || [], lane, { tags: product.tags || [], category: product.category }),
      }))
      .filter((entry) => entry.score > 0 && !concentration.exceeds(entry.product.id))
      .sort((a, b) => b.score - a.score)[0];

    if (!best) {
      // Genuinely nothing in the active catalog fits -- leave empty.
      continue;
    }

    const approved = best.score >= AUTO_APPROVE_SCORE_THRESHOLD;
    rows.push({
      article_id: article.id,
      product_id: best.product.id,
      match_score: best.score,
      match_reason: describeMatch(best.exactMatches, best.fuzzyMatches, best.laneMatches, lane, best.score),
      position: 0,
      approved,
      ...(approved
        ? { approved_at: new Date().toISOString(), approved_by: AUTO_APPROVE_ACTOR }
        : {}),
    });
    concentration.record(best.product.id);
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("article_affiliate_products")
      .upsert(rows, { onConflict: "article_id,product_id", ignoreDuplicates: true });

    if (insertError) {
      throw insertError;
    }
  }

  return { repaired: rows.length, stillOrphaned: orphans.length - rows.length };
}

/**
 * Targeted repair for the articles a specific product's deactivation could
 * have just orphaned -- only articles that actually had an approved match to
 * this product are worth checking, not the whole catalog.
 */
export async function repairOrphansForProduct(productId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: affected, error } = await supabase
    .from("article_affiliate_products")
    .select("article_id")
    .eq("product_id", productId)
    .eq("approved", true);

  if (error) {
    throw error;
  }

  const articleIds = [...new Set((affected || []).map((row) => row.article_id as string))];
  if (articleIds.length === 0) {
    return { repaired: 0, stillOrphaned: 0 };
  }

  const orphans = await findOrphanedArticles(supabase, articleIds);
  return repairOrphanedArticles(supabase, orphans);
}

/**
 * Full-catalog safety net -- catches any orphan the event hooks above
 * didn't, e.g. a product removed outside the normal activate/deactivate
 * path. Meant to run rarely and find little to nothing when the event hooks
 * are doing their job; called from the daily affiliate-match cron as a cheap
 * defense-in-depth check, not a separate schedule.
 */
export async function repairAllOrphans() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const orphans = await findOrphanedArticles(supabase);
  return repairOrphanedArticles(supabase, orphans);
}
