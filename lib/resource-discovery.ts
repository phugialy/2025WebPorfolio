import { createSupabaseAdminClient } from "@/lib/supabase/server";

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
 * anything reaches a reader, same two-gate review as any other match.
 */
export async function discoverResourcesForUncoveredArticles() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, tags")
    .eq("status", "published")
    .limit(200);
  if (articlesError) throw articlesError;

  const { data: existingMatches, error: matchesError } = await supabase
    .from("article_affiliate_products")
    .select("article_id");
  if (matchesError) throw matchesError;

  const covered = new Set((existingMatches || []).map((m) => m.article_id));
  const candidates = (articles || []).filter(
    (a) => !covered.has(a.id) && (a.tags || []).length > 0
  );

  let processed = 0;
  let discovered = 0;
  const log: string[] = [];

  for (const article of candidates) {
    if (processed >= MAX_ARTICLES_PER_RUN) break;
    const searchTerm = article.tags[0];
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
      log.push(`No qualifying candidate for "${searchTerm}" (article ${article.id})`);
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
          match_reason: `Auto-discovered via Canopy search for "${searchTerm}" (rating ${best.rating}, ${best.ratingsTotal} reviews)`,
          position: 0,
          approved: false,
        },
        { onConflict: "article_id,product_id", ignoreDuplicates: true }
      );

    if (matchInsertError) {
      log.push(`Failed to insert match for article ${article.id}: ${matchInsertError.message}`);
      continue;
    }

    log.push(`Discovered "${best.title}" for article ${article.id}`);
  }

  return { processed, discovered, log };
}
