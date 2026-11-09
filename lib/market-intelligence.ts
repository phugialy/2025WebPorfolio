import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { LANE_CATEGORIES } from "@/lib/affiliate";
import { searchCanopy, filterQualityCandidates, type CanopySearchResult } from "@/lib/canopy";
import { getTrendingKeywords } from "@/lib/trend-signals";
import { generateOpenRouterText } from "@/lib/openrouter";
import { safeJson } from "@/lib/content-agent-protocols";
import {
  MARKET_SCAN_FLAG,
  buildFitPrompt,
  meetsPriceFloor,
  pickTargets,
  priceValue,
  type DiscoveryPick,
  type DiscoveryTarget,
  type PlanSnapshot,
} from "@/lib/discovery-plan";

// Standing category awareness, distinct from lib/resource-discovery.ts's
// gap-filling job: that one only searches when an article has zero
// existing matches, and attaches its single pick directly to that article.
// This one runs independent of content coverage, proposing products so new
// candidates enter the catalog even when nothing forced the search -- landing
// purely as inactive catalog rows, never attached to an article.
//
// WHAT it searches comes from lib/discovery-plan.ts: during the holiday season
// (Nov 9 - Jan 2) a dated plan of the product types that carry the season
// (laptops, smartwatches, premium audio, microphones, mini PCs, monitors), at
// $100 and up; outside it, the original one-category-a-day rotation through
// the real category list (LANE_CATEGORIES). Either way a proposal is never
// public until an admin activates it, and activating it is what releases it
// to the Deals pages (see shouldClearProposalFlag in lib/affiliate.ts).
//
// MAX_CANDIDATES_PER_TARGET caps the model calls one search can cost: each
// candidate is a real OpenRouter call (evaluateProductFit below).
const MAX_CANDIDATES_PER_TARGET = 4;

function allCategories(): string[] {
  return [...new Set(Object.values(LANE_CATEGORIES).flat())];
}

type ProductFitVerdict = { approved: boolean; reasoning: string };

/**
 * Real reasoning step: audience fit, price tier, relevance durability and
 * category saturation. Canopy's search response DOES carry a price (an earlier
 * version of this comment said it did not, and the model was told to guess
 * from titles). It is passed in here, but only the holiday plan's prompt uses
 * it; the standing rotation keeps its original prompt unchanged.
 */
async function evaluateProductFit(params: {
  pick: DiscoveryPick;
  target: DiscoveryTarget;
  candidate: CanopySearchResult;
  existingNames: string[];
}): Promise<ProductFitVerdict> {
  const { pick, target, candidate, existingNames } = params;

  try {
    const prompt = buildFitPrompt({
      mode: pick.mode,
      target,
      title: candidate.title,
      rating: candidate.rating,
      ratingsTotal: candidate.ratingsTotal,
      price: priceValue(candidate.price),
      existingNames,
    });
    const result = await generateOpenRouterText([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
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

// The strategy snapshot the rotate-deals cron writes every 48 hours (live
// category performance). A snapshot older than this is ignored and the plan
// runs on its own priorities, so a stalled cron degrades to the static plan
// instead of steering on stale data.
const SNAPSHOT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

async function loadPlanSnapshot(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  now: number
): Promise<PlanSnapshot | null> {
  try {
    const { data } = await supabase
      .from("cron_runs")
      .select("summary, created_at")
      .eq("job", "rotate-deals")
      .eq("ok", true)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (!row) return null;
    if (now - Date.parse(row.created_at as string) > SNAPSHOT_MAX_AGE_MS) return null;
    const snapshot = (row.summary as { planSnapshot?: PlanSnapshot } | null)?.planSnapshot;
    return snapshot && typeof snapshot.epoch === "number" && snapshot.factors ? snapshot : null;
  } catch {
    return null;
  }
}

export async function discoverTrendingByCategory(now: number = Date.now()): Promise<{
  mode: DiscoveryPick["mode"];
  category: string;
  trendKeyword: string;
  targets: string[];
  liveFactors: Record<string, number>;
  candidatesEvaluated: number;
  discovered: number;
  log: string[];
}> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const snapshot = await loadPlanSnapshot(supabase, now);
  const pick = pickTargets(now, allCategories(), snapshot);
  const log: string[] = [];
  let discovered = 0;
  let candidatesEvaluated = 0;

  // The standing rotation keeps its original trend lookup (informational, and
  // the keyword it searches with). The holiday plan searches by product type
  // and has no use for a generic trend keyword.
  let trendKeyword = pick.targets[0].category;
  if (pick.mode === "standing-rotation") {
    const [trend] = await getTrendingKeywords(pick.targets[0].category, 1);
    trendKeyword = trend?.keyword || pick.targets[0].category;
    pick.targets[0] = { ...pick.targets[0], searchTerm: trendKeyword };
  }

  const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG;
  const flaggedAt = new Date().toISOString();

  for (const target of pick.targets) {
    let searchResults: CanopySearchResult[];
    try {
      searchResults = await searchCanopy(target.searchTerm);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.push(`Search failed for "${target.searchTerm}": ${message}`);
      continue;
    }

    // The same product can appear twice in one result set (seen live with the
    // Apple Watch SE 3); evaluate each ASIN once.
    const seenAsins = new Set<string>();
    const qualified = filterQualityCandidates(searchResults)
      .filter((c) => meetsPriceFloor(c.price, pick.priceFloor))
      .filter((c) => (seenAsins.has(c.asin) ? false : (seenAsins.add(c.asin), true)))
      .slice(0, MAX_CANDIDATES_PER_TARGET);
    if (qualified.length === 0) {
      log.push(
        pick.priceFloor > 0
          ? `No qualifying candidates at $${pick.priceFloor}+ for "${target.searchTerm}"`
          : `No qualifying candidates for "${target.searchTerm}"`
      );
      continue;
    }

    const { data: existingRows } = await supabase
      .from("affiliate_products")
      .select("name")
      .eq("category", target.category)
      .eq("status", "active")
      .limit(15);
    const existingNames = (existingRows ?? []).map((r) => r.name as string);

    for (const candidate of qualified) {
      const affiliateUrl = affiliateTag
        ? `https://www.amazon.com/dp/${candidate.asin}?tag=${affiliateTag}`
        : `https://www.amazon.com/dp/${candidate.asin}`;

      // Match on the ASIN, not the exact URL, so a product added by hand with
      // a different tag or URL form is not proposed a second time.
      const { data: existing } = await supabase
        .from("affiliate_products")
        .select("id")
        .ilike("affiliate_url", `%/dp/${candidate.asin}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      candidatesEvaluated += 1;
      const verdict = await evaluateProductFit({ pick, target, candidate, existingNames });

      if (!verdict.approved) {
        log.push(`Rejected "${candidate.title}": ${verdict.reasoning}`);
        continue;
      }

      const { error: insertError } = await supabase.from("affiliate_products").insert({
        name: candidate.title,
        network: "amazon",
        category: target.category,
        tags: [target.category, pick.mode === "holiday-plan" ? target.key : trendKeyword].filter(
          (v, i, arr) => arr.indexOf(v) === i
        ),
        image_url: candidate.mainImageUrl || null,
        affiliate_url: affiliateUrl,
        status: "inactive",
        flag_reason: MARKET_SCAN_FLAG,
        flagged_at: flaggedAt,
        discovery_reasoning: verdict.reasoning,
      });

      if (insertError) {
        log.push(`Failed to insert "${candidate.title}": ${insertError.message}`);
        continue;
      }

      discovered += 1;
      log.push(`Proposed "${candidate.title}" for "${target.category}": ${verdict.reasoning}`);
    }
  }

  return {
    mode: pick.mode,
    category: pick.targets[0].category,
    trendKeyword,
    targets: pick.targets.map((t) => t.key),
    liveFactors: snapshot?.factors ?? {},
    candidatesEvaluated,
    discovered,
    log,
  };
}
