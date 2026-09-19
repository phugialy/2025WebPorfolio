import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { LANE_CATEGORIES } from "@/lib/affiliate";
import { searchCanopy, filterQualityCandidates } from "@/lib/canopy";

// Standing category awareness, distinct from lib/resource-discovery.ts's
// gap-filling job: that one only searches when an article has zero
// existing matches, and attaches its single pick directly to that article.
// This one runs independent of content coverage, proposing what's
// currently trending in each real taxonomy category so new candidates
// enter the catalog even when nothing forced the search -- landing purely
// as inactive catalog rows, never attached to an article.
//
// One category per run, rotating through the real category list (6 total,
// pulled from LANE_CATEGORIES rather than an open-ended taxonomy) so a
// daily cron covers every category once every 6 days -- well inside the
// Canopy budget already validated for the discovery job (2 searches/run
// there, 1 search/run here).
const MAX_CANDIDATES_PER_RUN = 10;

function allCategories(): string[] {
  return [...new Set(Object.values(LANE_CATEGORIES).flat())];
}

export async function discoverTrendingByCategory(): Promise<{
  category: string;
  processed: number;
  discovered: number;
  log: string[];
}> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const categories = allCategories();
  const dayIndex = Math.floor(Date.now() / 86400000);
  const category = categories[dayIndex % categories.length];

  const log: string[] = [];
  let discovered = 0;

  let searchResults;
  try {
    searchResults = await searchCanopy(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.push(`Search failed for "${category}": ${message}`);
    return { category, processed: 0, discovered: 0, log };
  }

  const qualified = filterQualityCandidates(searchResults).slice(0, MAX_CANDIDATES_PER_RUN);
  if (qualified.length === 0) {
    log.push(`No qualifying candidates for "${category}"`);
    return { category, processed: 0, discovered: 0, log };
  }

  const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG;
  const now = new Date().toISOString();

  for (const candidate of qualified) {
    const affiliateUrl = affiliateTag
      ? `https://www.amazon.com/dp/${candidate.asin}?tag=${affiliateTag}`
      : `https://www.amazon.com/dp/${candidate.asin}`;

    const { data: existing } = await supabase
      .from("affiliate_products")
      .select("id")
      .eq("affiliate_url", affiliateUrl)
      .maybeSingle();

    if (existing) {
      continue;
    }

    const { error: insertError } = await supabase.from("affiliate_products").insert({
      name: candidate.title,
      network: "amazon",
      category,
      tags: [category],
      image_url: candidate.mainImageUrl || null,
      affiliate_url: affiliateUrl,
      status: "inactive",
      flag_reason: "market-scan proposal",
      flagged_at: now,
    });

    if (insertError) {
      log.push(`Failed to insert "${candidate.title}": ${insertError.message}`);
      continue;
    }

    discovered += 1;
    log.push(
      `Proposed "${candidate.title}" for "${category}" (rating ${candidate.rating}, ${candidate.ratingsTotal} reviews)`
    );
  }

  return { category, processed: qualified.length, discovered, log };
}
