import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { LANE_CATEGORIES } from "@/lib/affiliate";
import { inferPortfolioLane } from "@/lib/lanes";

// Deliberately conservative, matching the budget plan agreed on: at most 2
// Canopy searches per run (~60/month against a 100/month free tier, with
// headroom). Quality gate mirrors what the live test validated: sponsored
// placements are noise, rating + review count are the real signal.
const MAX_ARTICLES_PER_RUN = 2;
const MIN_RATING = 4.0;
const MIN_REVIEWS = 20;

type CanopySearchResult = {
  sponsored?: boolean;
  title: string;
  asin: string;
  mainImageUrl?: string;
  rating: number | null;
  ratingsTotal: number | null;
};

async function searchCanopy(searchTerm: string): Promise<CanopySearchResult[]> {
  const apiKey = process.env.CANOPY_API_KEY;
  if (!apiKey) {
    throw new Error("CANOPY_API_KEY is not configured");
  }

  const response = await fetch(
    `https://rest.canopyapi.co/api/amazon/search?searchTerm=${encodeURIComponent(searchTerm)}`,
    { headers: { "API-KEY": apiKey } }
  );

  if (!response.ok) {
    throw new Error(`Canopy search failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.data?.amazonProductSearchResults?.productResults?.results || [];
}

function pickBestCandidate(results: CanopySearchResult[]): CanopySearchResult | null {
  const candidates = results
    .filter((r) => !r.sponsored)
    .filter((r) => typeof r.rating === "number" && r.rating >= MIN_RATING)
    .filter((r) => typeof r.ratingsTotal === "number" && r.ratingsTotal >= MIN_REVIEWS)
    .sort((a, b) => (b.rating as number) - (a.rating as number) || (b.ratingsTotal as number) - (a.ratingsTotal as number));

  return candidates[0] || null;
}

/**
 * Fallback discovery layer behind the manual/tag-lane matcher in
 * lib/affiliate.ts -- only ever considers articles with zero existing
 * matches (approved or pending), so it never duplicates or overrides a
 * human-curated catalog match. Discovered products always start `inactive`
 * (never public) and their matches always start `approved: false` -- an
 * admin has to both activate the product and approve the match before
 * anything reaches a reader, same two-gate review as any other match, so
 * this can never flood a page on its own.
 *
 * Search terms used to be an uncovered article's raw first tag ("LLM
 * Agents", "EvoSOP") -- not real Amazon shopping language, which is why
 * this had produced zero results ever, despite running daily: Canopy had
 * nothing real to match against. Now it searches the same curated,
 * proven-good product categories the main matcher uses (LANE_CATEGORIES),
 * picking which category to spend today's limited Canopy budget on by
 * ranking categories against our own trend signal -- the already-computed
 * `rank_score` (recency + engagement + curation) summed across each
 * category's uncovered articles. That's "trending in our own content,"
 * without adding an unofficial Google Trends dependency. Once GSC is
 * actually reporting real query volume, that's a stronger first-party
 * signal to layer in on top of this -- not before.
 */
export async function discoverResourcesForUncoveredArticles() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, tags, portfolio_lane, rank_score")
    .eq("status", "published")
    .limit(500);
  if (articlesError) throw articlesError;

  const { data: existingMatches, error: matchesError } = await supabase
    .from("article_affiliate_products")
    .select("article_id");
  if (matchesError) throw matchesError;

  const covered = new Set((existingMatches || []).map((m) => m.article_id));
  const uncovered = (articles || []).filter((a) => !covered.has(a.id));

  // Roll each uncovered article's rank_score up into every product category
  // its lane maps to, tracking the single best-scoring article per category
  // so a qualifying product gets attached to the highest-signal candidate,
  // not just whichever article happened to come first in the query.
  const categoryTrend = new Map<string, { score: number; bestArticle: (typeof uncovered)[number] }>();
  for (const article of uncovered) {
    const lane = inferPortfolioLane(article.portfolio_lane, article.tags, article.title);
    const categories = LANE_CATEGORIES[lane] || [];
    const score = article.rank_score || 0;
    for (const category of categories) {
      const existing = categoryTrend.get(category);
      if (!existing) {
        categoryTrend.set(category, { score, bestArticle: article });
        continue;
      }
      existing.score += score;
      if (score > (existing.bestArticle.rank_score || 0)) {
        existing.bestArticle = article;
      }
    }
  }

  const rankedCategories = [...categoryTrend.entries()].sort((a, b) => b[1].score - a[1].score);

  let processed = 0;
  let discovered = 0;
  const log: string[] = [];

  for (const [category, { bestArticle: article }] of rankedCategories) {
    if (processed >= MAX_ARTICLES_PER_RUN) break;
    const searchTerm = category;
    processed += 1;

    let searchResults: CanopySearchResult[];
    try {
      searchResults = await searchCanopy(searchTerm);
    } catch (error) {
      log.push(`Search failed for "${searchTerm}": ${error instanceof Error ? error.message : error}`);
      continue;
    }

    const best = pickBestCandidate(searchResults);
    if (!best) {
      log.push(`No qualifying candidate for "${searchTerm}" (trending pick for article ${article.id})`);
      continue;
    }

    const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG;
    const affiliateUrl = affiliateTag
      ? `https://www.amazon.com/dp/${best.asin}?tag=${affiliateTag}`
      : `https://www.amazon.com/dp/${best.asin}`;

    const { data: existingProduct } = await supabase
      .from("affiliate_products")
      .select("id")
      .eq("affiliate_url", affiliateUrl)
      .maybeSingle();

    let productId: string | undefined = existingProduct?.id;

    if (!productId) {
      const { data: newProduct, error: insertError } = await supabase
        .from("affiliate_products")
        .insert({
          name: best.title,
          network: "amazon",
          category: searchTerm,
          tags: [searchTerm],
          image_url: best.mainImageUrl || null,
          affiliate_url: affiliateUrl,
          status: "inactive",
        })
        .select("id")
        .single();

      if (insertError) {
        log.push(`Failed to insert product for "${searchTerm}": ${insertError.message}`);
        continue;
      }
      productId = newProduct.id as string;
      discovered += 1;
    }

    const { error: matchInsertError } = await supabase
      .from("article_affiliate_products")
      .upsert(
        {
          article_id: article.id,
          product_id: productId,
          match_score: best.rating,
          match_reason: `Trending pick: auto-discovered via Canopy search for "${searchTerm}" (rating ${best.rating}, ${best.ratingsTotal} reviews) -- matched to the highest-signal uncovered article in this category`,
          position: 0,
          approved: false,
        },
        { onConflict: "article_id,product_id", ignoreDuplicates: true }
      );

    if (matchInsertError) {
      log.push(`Failed to insert match for article ${article.id}: ${matchInsertError.message}`);
      continue;
    }

    log.push(`Discovered "${best.title}" for category "${category}" -> article ${article.id}`);
  }

  return { processed, discovered, log };
}
