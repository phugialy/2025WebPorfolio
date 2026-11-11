import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/affiliate";
import { getGuideSummaries } from "@/lib/articles";
import type { BlogPost } from "@/lib/articles";
import { STRATEGY_CATEGORIES, categoryFactors, rotationBucket, rotationKeys, rotationStart } from "@/lib/deals-rotation";
import {
  AMAZON_DEALS_ID,
  HOLIDAYS,
  TOP_N,
  TOP_OVERALL,
  activeDeals,
  applyCategoryOverrides,
  assignBadges,
  attachCatalog,
  attachFacts,
  buildGuideLinks,
  buildSections,
  DEALS_TAG,
  dropBooks,
  holidayTop,
  isEligible,
  pinOrder,
  scoreProducts,
  toExplorerItems,
  topOverall,
  type CatalogRow,
  type ClickRow,
  type Deal,
  type DealsProduct,
  type DealsSection,
  type ExplorerItem,
  type FactsRow,
  type GuideLink,
  type ScoredProduct,
} from "@/lib/deals-core";

// Deals added by hand. Code-managed for now; each needs a full external link
// with our affiliate tag. Expired deals hide themselves after `validTo`. Never
// add prices, "% off" or savings claims here unless the merchant's own terms
// allow it: retail prices change daily.
export const MANUAL_DEALS: Deal[] = [];

export type DealsPageData = {
  top: ScoredProduct[];
  sections: DealsSection[];
  explorer: ExplorerItem[];
  holidays: Record<string, ScoredProduct[]>;
  deals: Deal[];
  generatedAt: string;
  // The rotation period this data was built for (lib/deals-rotation.ts).
  rotation: { bucket: number; startedAt: string; enabled: boolean };
  // Live per-category performance used in this rotation (lib/deals-rotation.ts categoryFactors).
  categoryFactors: Record<string, number>;
};

const empty = (): DealsPageData => ({
  top: [],
  sections: [],
  explorer: [],
  holidays: {},
  deals: [],
  generatedAt: new Date().toISOString(),
  rotation: { bucket: 0, startedAt: new Date(0).toISOString(), enabled: false },
  categoryFactors: {},
});

function amazonTagFrom(urls: string[]): string | null {
  for (const url of urls) {
    const match = /[?&]tag=([^&]+)/.exec(url);
    if (match) return match[1];
  }
  return null;
}

async function loadDealsData(bucket: number): Promise<DealsPageData> {
  const read = createSupabaseReadClient();
  const admin = createSupabaseAdminClient();
  if (!read) return empty();

  const { data, error } = await read
    .from("affiliate_products")
    .select("id, name, category, image_url, description, buy_if, skip_if, is_partner, flag_reason, network, affiliate_url, promo_code, promo_details, brand, created_at")
    .eq("status", "active");
  if (error) {
    console.error("Deals: product load failed:", error);
    return empty();
  }
  const rows = (data || []) as (DealsProduct & {
    network: string;
    affiliate_url: string;
    promo_code: string | null;
    promo_details: string | null;
    brand: string | null;
  })[];
  const eligible = dropBooks(applyCategoryOverrides(rows.filter((p) => isEligible(p))));

  // The dedicated catalog: only products with a deals_catalog entry appear, with
  // that entry's tags. The table is read with the service-role key (it has no
  // public policy). If it is missing or empty, every eligible product appears
  // with tags worked out from its category, so a deploy never blanks the page.
  let catalogRows: CatalogRow[] | null = null;
  if (admin) {
    const { data: entries, error: catalogError } = await admin
      .from("deals_catalog")
      .select("product_id, tags, pinned_rank, hidden");
    if (catalogError) console.warn("Deals: deals_catalog unavailable, using category tags:", catalogError.message);
    else catalogRows = (entries || []) as CatalogRow[];
  }
  const { products: catalogProducts } = attachCatalog(eligible, catalogRows);

  // Card facts (what it is, who it is for, the catch). Written by the holiday
  // guide engine. Missing table or no rows just means cards fall back to the
  // product's own text, so this can never blank the page.
  let factsRows: FactsRow[] | null = null;
  if (admin) {
    const { data: factEntries, error: factsError } = await admin
      .from("deals_product_facts")
      .select(
        "product_id, what_it_is, best_for, buy_if, skip_if, strengths, caveats, key_specs, price_class, verdict, confidence, evidence_count, evidence_newest, verified_at, guide_slug"
      );
    if (factsError) console.warn("Deals: deals_product_facts unavailable, cards use product text:", factsError.message);
    else factsRows = (factEntries || []) as FactsRow[];
  }
  const products = attachFacts(catalogProducts, factsRows);
  const pins = pinOrder(products);

  // Two weeks of human-flagged clicks (a few thousand small rows), read at
  // most once every few hours because the whole result is cached.
  let clicks: ClickRow[] = [];
  if (admin) {
    try {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      clicks = await fetchAllRows<ClickRow>((from, to) =>
        admin
          .from("affiliate_clicks")
          .select("product_id, user_agent, created_at, article_slug")
          .eq("is_bot", false)
          .gte("created_at", since)
          .range(from, to)
      );
    } catch (clickError) {
      console.error("Deals: click load failed, ranking without activity:", clickError);
    }
  }

  const now = Date.now();
  const clicked = scoreProducts(products, clicks, now);
  // Daily rotation (lib/deals-rotation.ts). DEALS_ROTATION=off turns it off and
  // brings back the plain order by activity.
  const rotationEnabled = process.env.DEALS_ROTATION !== "off";
  const factors = categoryFactors(clicked, { only: STRATEGY_CATEGORIES });
  const keys = rotationKeys(clicked, now, { enabled: rotationEnabled, factors });
  const ranked = clicked.map((p) => ({ ...p, rotation: keys.get(p.id) ?? 0 }));
  // Labels (Trending, New this week) go to very few products; see assignBadges.
  const badges = assignBadges(ranked, now);
  const scored = ranked.map((p) => ({ ...p, badge: badges.get(p.id) ?? null }));
  const top = topOverall(scored, TOP_OVERALL, pins);
  const sections = buildSections(scored, undefined, new Set(top.map((p) => p.id)));
  const holidays = Object.fromEntries(HOLIDAYS.map((h) => [h.slug, holidayTop(h, scored, TOP_N, pins)]));

  // Featured deals: Amazon's own holiday deals page (the live prices are
  // Amazon's, not ours), any partner that publishes a promo code, and the
  // hand-managed list.
  const deals: Deal[] = [...MANUAL_DEALS];
  const tag = amazonTagFrom(rows.filter((r) => r.network === "amazon").map((r) => r.affiliate_url));
  if (tag) {
    deals.unshift({
      id: AMAZON_DEALS_ID,
      merchant: "Amazon",
      title: "Amazon holiday deals",
      description: "Amazon's own deals page, updated by Amazon throughout the season. Check the live price before you buy.",
      url: `https://www.amazon.com/deals?tag=${encodeURIComponent(tag)}`,
      featured: true,
    });
  }
  for (const partner of rows.filter((r) => r.is_partner && r.promo_code && !r.flag_reason)) {
    deals.push({
      id: `partner-${partner.id}`,
      merchant: partner.brand || partner.name,
      title: `${partner.brand || partner.name} offer`,
      description: partner.promo_details || `Use the promo code at checkout.`,
      url: `/api/affiliate/go/${partner.id}?ref=deals-featured`,
      promoCode: partner.promo_code || undefined,
    });
  }

  return {
    top,
    sections,
    explorer: toExplorerItems(scored),
    holidays,
    deals: activeDeals(deals),
    generatedAt: new Date().toISOString(),
    rotation: { bucket, startedAt: new Date(rotationStart(bucket)).toISOString(), enabled: rotationEnabled },
    categoryFactors: factors,
  };
}

// Cached for 6 hours so the pages cost almost nothing per visit. The rotation
// period is part of the cache key, so the first read after the daily boundary
// builds a fresh lineup instead of serving yesterday's, and the rotate-deals
// cron warms it at that moment.
export function getDealsData(now: number = Date.now()): Promise<DealsPageData> {
  const bucket = rotationBucket(now);
  return unstable_cache(() => loadDealsData(bucket), ["deals-page-data-v9", String(bucket)], {
    revalidate: 6 * 60 * 60,
    tags: ["deals"],
  })();
}

// Published holiday buying guides (the DEALS_TAG tag). Newest first.
export async function getDealsArticles(limit = 12): Promise<BlogPost[]> {
  const posts = await getGuideSummaries();
  return posts
    .sort((a, b) => (b.publishDate ?? b.createdAt ?? 0) - (a.publishDate ?? a.createdAt ?? 0))
    .slice(0, limit);
}

// Which published guide features each product, so a card can say "Read the
// guide". Guides name products by their /api/affiliate/go/<id> links. Cached
// for an hour; a failed read means no links, never a broken page.
async function loadGuideLinks(): Promise<Record<string, GuideLink>> {
  const read = createSupabaseReadClient();
  if (!read) return {};
  const { data, error } = await read
    .from("articles")
    .select("slug, title, content, published_at, created_at")
    .eq("status", "published")
    // articles.tags is a JSON column: it needs the JSON form, not a Postgres
    // array (the same filter lib/articles.ts uses). The array form failed with
    // "invalid input syntax for type json" and silently produced no links.
    .filter("tags", "cs", JSON.stringify([DEALS_TAG]));
  if (error) {
    // Throw so a failed read is never cached as "no guides" for an hour.
    throw new Error(`guide links failed to load: ${error.message}`);
  }
  return buildGuideLinks(
    (data || []).map((row) => ({
      slug: row.slug as string,
      title: row.title as string,
      content: (row.content as string) || "",
      when: Date.parse((row.published_at as string) || (row.created_at as string)) || 0,
    }))
  );
}

const cachedGuideLinks = unstable_cache(loadGuideLinks, ["deals-guide-links-v2"], {
  revalidate: 60 * 60,
  tags: ["deals"],
});

// A failed read means no links on this render, never a broken page, and (because
// the loader throws) the failure is not cached: the next request tries again.
export async function getGuideLinks(): Promise<Record<string, GuideLink>> {
  try {
    return await cachedGuideLinks();
  } catch (error) {
    console.error("Deals:", error instanceof Error ? error.message : error);
    return {};
  }
}
