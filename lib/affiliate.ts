import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/server";

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
};

export type ArticleAffiliateMatch = {
  id: string;
  article_id: string;
  product_id: string;
  match_score: number | null;
  match_reason: string | null;
  position: number;
  approved: boolean;
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
export async function getApprovedProductsForArticle(
  articleId: string
): Promise<AffiliateProduct[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("article_affiliate_products")
    .select("position, affiliate_products(*)")
    .eq("article_id", articleId)
    .eq("approved", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching affiliate matches:", error);
    return [];
  }

  return (data || [])
    .map((row) => row.affiliate_products as unknown as AffiliateProduct)
    .filter((product): product is AffiliateProduct => Boolean(product) && product.status === "active");
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
    })
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

export async function approveMatch(id: string, approvedBy: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { error } = await supabase
    .from("article_affiliate_products")
    .update({
      approved: true,
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

// --- Matcher cron ---

// Deliberately conservative: this is a first-time affiliate rollout. One
// well-justified mention beats a rail of products, and most articles should
// end up with no match at all rather than a weak one. See match_reason below
// for why a given product was proposed — approval should fail closed if that
// reason isn't specific.
const MAX_MATCHES_PER_ARTICLE = 1;
const MIN_MATCH_SCORE = 2;
// No single product should dominate the approval queue — if one vendor is
// already heavily represented among pending+approved matches, deprioritize it
// so the catalog doesn't read as a single-vendor endorsement.
const MAX_SHARE_PER_PRODUCT = 0.2;

function scoreMatch(
  articleTags: string[],
  articleLane: string | null,
  product: { tags: string[]; category: string | null }
) {
  const articleTagSet = new Set(articleTags.map((t) => t.toLowerCase()));
  const matchedTags = product.tags.filter((tag) => articleTagSet.has(tag.toLowerCase()));

  let score = matchedTags.length;
  const lane = (articleLane || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const laneMatches = Boolean(lane && category && (lane.includes(category) || category.includes(lane)));
  if (laneMatches) {
    score += 2;
  }

  return { score, matchedTags, laneMatches };
}

function describeMatch(matchedTags: string[], laneMatches: boolean, lane: string | null) {
  const reasons: string[] = [];
  if (matchedTags.length > 0) {
    reasons.push(`shares tag${matchedTags.length > 1 ? "s" : ""} ${matchedTags.join(", ")}`);
  }
  if (laneMatches && lane) {
    reasons.push(`matches the ${lane} lane`);
  }
  return reasons.length > 0 ? reasons.join("; ") : "no specific overlap found";
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
    .select("id, tags, portfolio_lane")
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
  const candidates = (articles || []).filter((article) => !alreadyMatched.has(article.id));

  let matched = 0;

  for (const article of candidates) {
    const lane = article.portfolio_lane;
    const best = products
      .map((product) => {
        const { score, matchedTags, laneMatches } = scoreMatch(article.tags || [], lane, {
          tags: product.tags || [],
          category: product.category,
        });
        return { product, score, matchedTags, laneMatches };
      })
      .filter((entry) => entry.score >= MIN_MATCH_SCORE)
      .filter((entry) => !exceedsVendorConcentration(entry.product.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHES_PER_ARTICLE);

    if (best.length === 0) {
      continue;
    }

    const rows = best.map((entry, index) => ({
      article_id: article.id,
      product_id: entry.product.id,
      match_score: entry.score,
      match_reason: describeMatch(entry.matchedTags, entry.laneMatches, lane),
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
