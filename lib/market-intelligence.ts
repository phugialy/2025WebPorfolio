import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { LANE_CATEGORIES } from "@/lib/affiliate";
import { searchCanopy, filterQualityCandidates, type CanopySearchResult } from "@/lib/canopy";
import { getTrendingKeywords } from "@/lib/trend-signals";
import { generateOpenRouterText } from "@/lib/openrouter";
import { safeJson } from "@/lib/content-agent-protocols";

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
// daily cron covers every category once every 6 days.
//
// MAX_CANDIDATES_PER_RUN dropped from 10 to 5 versus the first version of
// this job -- each candidate now costs a real OpenRouter call (see
// evaluateProductFit below), not just a database existence check, so the
// per-run ceiling needs to account for that cost, matching the same
// budget-consciousness already applied to Canopy searches elsewhere.
const MAX_CANDIDATES_PER_RUN = 5;

function allCategories(): string[] {
  return [...new Set(Object.values(LANE_CATEGORIES).flat())];
}

type ProductFitVerdict = { approved: boolean; reasoning: string };

/**
 * Real reasoning step, replacing the previous version's "rating >= 4.0 and
 * >= 20 reviews is good enough" heuristic. Judges audience fit, plausible
 * price tier, relevance durability, and category saturation -- the factors
 * named directly by the site owner, not just Canopy's star rating.
 *
 * Known limitation, stated here rather than hidden: Canopy's search
 * response carries no price or description, so the model reasons from
 * title/category conventions only for price-fit. Fetching Canopy's
 * product-detail endpoint per candidate (real price, real description) is
 * the natural next upgrade if this proves too coarse -- deliberately not
 * built here to keep this pass's scope to "add reasoning," not "also add a
 * second Canopy integration."
 */
async function evaluateProductFit(params: {
  category: string;
  trendKeyword: string;
  candidate: CanopySearchResult;
}): Promise<ProductFitVerdict> {
  const { category, trendKeyword, candidate } = params;

  try {
    const result = await generateOpenRouterText([
      {
        role: "system",
        content: `You screen affiliate product candidates for a practical AI, automation, and software-systems publication read by engineers, operators, and builders. You do not have price or description data -- reason from the title and category only, and say so in your reasoning rather than guessing a number.

Approve only if the product plausibly satisfies ALL of:
- Audience fit: a reader of AI/automation/dev-tools content and AI-hardware-accessory content would plausibly want this, not a generic unrelated household item that only matched the category keyword.
- Price tier: judging from the title/category conventions, this reads as an impulse-friendly purchase for someone reading an article, not a large planned purchase.
- Relevance durability: this looks like a durable, ongoing-useful product category, not a one-week fad or a seasonal novelty.
- Category saturation: this isn't the single most obvious, already-everywhere pick for this category (e.g. avoid rubber-stamping the single best-selling item every similar site already promotes) unless it's genuinely the right call.

Respond with strict JSON only, no markdown fencing, no commentary outside the JSON: {"approved": boolean, "reasoning": string}. Keep "reasoning" to 1-2 sentences.`,
      },
      {
        role: "user",
        content: `Category: ${category}\nSearch keyword used: ${trendKeyword}\nCandidate title: ${candidate.title}\nRating: ${candidate.rating ?? "unknown"} (${candidate.ratingsTotal ?? "unknown"} reviews)`,
      },
    ]);

    return safeJson<ProductFitVerdict>(result.content, {
      approved: false,
      reasoning: "Could not parse model output -- defaulted to reject",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { approved: false, reasoning: `Evaluation call failed -- defaulted to reject: ${message}` };
  }
}

export async function discoverTrendingByCategory(): Promise<{
  category: string;
  trendKeyword: string;
  candidatesEvaluated: number;
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

  const [trend] = await getTrendingKeywords(category, 1);
  const trendKeyword = trend?.keyword || category;

  let searchResults;
  try {
    searchResults = await searchCanopy(trendKeyword);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.push(`Search failed for "${trendKeyword}": ${message}`);
    return { category, trendKeyword, candidatesEvaluated: 0, discovered: 0, log };
  }

  const qualified = filterQualityCandidates(searchResults).slice(0, MAX_CANDIDATES_PER_RUN);
  if (qualified.length === 0) {
    log.push(`No qualifying candidates for "${trendKeyword}"`);
    return { category, trendKeyword, candidatesEvaluated: 0, discovered: 0, log };
  }

  const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG;
  const now = new Date().toISOString();
  let candidatesEvaluated = 0;

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

    candidatesEvaluated += 1;
    const verdict = await evaluateProductFit({ category, trendKeyword, candidate });

    if (!verdict.approved) {
      log.push(`Rejected "${candidate.title}": ${verdict.reasoning}`);
      continue;
    }

    const { error: insertError } = await supabase.from("affiliate_products").insert({
      name: candidate.title,
      network: "amazon",
      category,
      tags: [category, trendKeyword].filter((v, i, arr) => arr.indexOf(v) === i),
      image_url: candidate.mainImageUrl || null,
      affiliate_url: affiliateUrl,
      status: "inactive",
      flag_reason: "market-scan proposal",
      flagged_at: now,
      discovery_reasoning: verdict.reasoning,
    });

    if (insertError) {
      log.push(`Failed to insert "${candidate.title}": ${insertError.message}`);
      continue;
    }

    discovered += 1;
    log.push(`Proposed "${candidate.title}" for "${category}": ${verdict.reasoning}`);
  }

  return { category, trendKeyword, candidatesEvaluated, discovered, log };
}
