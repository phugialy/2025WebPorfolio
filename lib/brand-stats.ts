import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/affiliate";
import { dealsRef } from "@/lib/deals-core";
import { INSTA360_REF_SLUG } from "@/lib/brands/insta360";
import { querySearchAnalytics } from "@/lib/gsc";
import {
  summarizeBrandPage,
  type BrandWindow,
  type CardInfo,
  type ClickRow,
  type ImpressionRow,
} from "@/lib/brand-stats-core";

// Admin read-out for /deals/insta360: card views and clicks (first-party,
// lib/brand-stats-core.ts has the rules) and what Google Search sends the page
// (Search Console). Page views themselves are in Google Analytics, which is on
// for every page of the live site; this file does not duplicate them.

const DAY = 24 * 60 * 60 * 1000;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");
export const INSTA360_PAGE_PATH = "/deals/insta360";
const GSC_PROPERTY = "sc-domain:phugialy.com"; // the only property that returns data (lib/seo-audit.ts)

export type SearchStat = { clicks: number; impressions: number; position: number | null; queries: Array<{ query: string; clicks: number; impressions: number; position: number }> };
export type BrandStats = {
  page: string;
  windows: { "7d": BrandWindow; "30d": BrandWindow };
  firstSeen: string | null;
  // null when Search Console could not be reached; the error says why.
  search: { "28d": SearchStat | null; error: string | null; through: string };
};

async function loadSearch(): Promise<{ stat: SearchStat | null; error: string | null; through: string }> {
  // Search Console data runs about 2 days behind.
  const end = new Date(Date.now() - 2 * DAY);
  const start = new Date(end.getTime() - 27 * DAY);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const through = iso(end);
  try {
    const params = { siteUrl: GSC_PROPERTY, startDate: iso(start), endDate: through, pageEquals: `${SITE}${INSTA360_PAGE_PATH}` };
    const [totals, queries] = await Promise.all([
      querySearchAnalytics({ ...params, dimensions: ["page"], rowLimit: 1 }),
      querySearchAnalytics({ ...params, dimensions: ["query"], rowLimit: 10 }),
    ]);
    const t = totals[0];
    return {
      stat: {
        clicks: t?.clicks ?? 0,
        impressions: t?.impressions ?? 0,
        position: t ? t.position : null,
        queries: queries.map((q) => ({ query: q.keys[0], clicks: q.clicks, impressions: q.impressions, position: q.position })),
      },
      error: null,
      through,
    };
  } catch (error) {
    return { stat: null, error: error instanceof Error ? error.message.slice(0, 200) : "Search Console unavailable", through };
  }
}

export async function getInsta360Stats(): Promise<BrandStats> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Database client unavailable");

  const ref = dealsRef(INSTA360_REF_SLUG);
  const now = Date.now();
  const cutoff = new Date(now - 30 * DAY).toISOString();

  const [products, impressions, clicks, search] = await Promise.all([
    // Every Insta360 store row, retired ones too, so an old click still has a name.
    supabase.from("affiliate_products").select("id, name, category").ilike("affiliate_url", "https://store.insta360.com/product/%"),
    fetchAllRows<ImpressionRow>((from, to) =>
      supabase
        .from("affiliate_impressions")
        .select("product_id, created_at")
        .eq("article_slug", ref)
        .eq("is_bot", false)
        .gte("created_at", cutoff)
        .range(from, to)
    ),
    // Site-wide human clicks: a sweeper is judged on everything it opened that day.
    fetchAllRows<ClickRow>((from, to) =>
      supabase
        .from("affiliate_clicks")
        .select("product_id, article_slug, user_agent, created_at")
        .eq("is_bot", false)
        .gte("created_at", cutoff)
        .range(from, to)
    ),
    loadSearch(),
  ]);
  if (products.error) throw new Error(`Product read failed: ${products.error.message}`);

  const cards = new Map<string, CardInfo>();
  for (const p of (products.data ?? []) as Array<{ id: string; name: string; category: string | null }>) {
    cards.set(p.id, { name: p.name, group: /accessor/i.test(p.category ?? "") ? "accessory" : "camera" });
  }

  const firstSeen = impressions.reduce<string | null>((min, r) => (min === null || r.created_at < min ? r.created_at : min), null);
  const forDays = (days: number) => summarizeBrandPage({ ref, impressions, allHumanClicks: clicks, cards, since: now - days * DAY, now });

  return {
    page: INSTA360_PAGE_PATH,
    windows: { "7d": forDays(7), "30d": forDays(30) },
    firstSeen,
    search: { "28d": search.stat, error: search.error, through: search.through },
  };
}
