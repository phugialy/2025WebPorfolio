import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/affiliate";
import { describeDealsRef } from "@/lib/deals-core";

// What the Deals pages are doing, from the two first-party logs: a card that
// was on screen (affiliate_impressions) and an outbound click
// (affiliate_clicks). Both carry the same "deals-..." label, so click-through
// is a straight join on it. Bots are left out of both sides, the same rule
// every other CTR number on the site uses.

export type SectionRow = { ref: string; label: string; impressions: number; clicks: number; ctr: number | null };
export type ProductRow = { id: string; name: string; impressions: number; clicks: number; ctr: number | null };
export type DealsWindow = {
  sections: SectionRow[];
  products: ProductRow[];
  impressions: number;
  clicks: number;
  ctr: number | null;
};
export type DealsStats = {
  windows: { "7d": DealsWindow; "30d": DealsWindow };
  // The first impression on record. Before this date the sections show clicks
  // only, so a low click-through early on just means counting had not started.
  impressionsSince: string | null;
};

type Row = { product_id: string | null; article_slug: string | null; created_at: string };

const DAY = 24 * 60 * 60 * 1000;
const ratio = (clicks: number, impressions: number) => (impressions > 0 ? clicks / impressions : null);

function summarize(impressions: Row[], clicks: Row[], since: number, names: Map<string, string>): DealsWindow {
  const inWindow = (row: Row) => new Date(row.created_at).getTime() >= since;
  const bySection = new Map<string, { impressions: number; clicks: number }>();
  const byProduct = new Map<string, { impressions: number; clicks: number }>();
  const touch = (map: Map<string, { impressions: number; clicks: number }>, key: string) => {
    if (!map.has(key)) map.set(key, { impressions: 0, clicks: 0 });
    return map.get(key)!;
  };

  for (const row of impressions) {
    if (!inWindow(row) || !row.article_slug) continue;
    touch(bySection, row.article_slug).impressions += 1;
    if (row.product_id) touch(byProduct, row.product_id).impressions += 1;
  }
  for (const row of clicks) {
    if (!inWindow(row) || !row.article_slug) continue;
    touch(bySection, row.article_slug).clicks += 1;
    if (row.product_id) touch(byProduct, row.product_id).clicks += 1;
  }

  const sections: SectionRow[] = [...bySection.entries()]
    .map(([ref, v]) => ({ ref, label: describeDealsRef(ref), ...v, ctr: ratio(v.clicks, v.impressions) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
  const products: ProductRow[] = [...byProduct.entries()]
    .map(([id, v]) => ({ id, name: names.get(id) ?? "Unknown product", ...v, ctr: ratio(v.clicks, v.impressions) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 10);

  const impressionsTotal = sections.reduce((n, s) => n + s.impressions, 0);
  const clicksTotal = sections.reduce((n, s) => n + s.clicks, 0);
  return { sections, products, impressions: impressionsTotal, clicks: clicksTotal, ctr: ratio(clicksTotal, impressionsTotal) };
}

export async function getDealsStats(): Promise<DealsStats> {
  const empty = (): DealsWindow => ({ sections: [], products: [], impressions: 0, clicks: 0, ctr: null });
  const emptyStats: DealsStats = { windows: { "7d": empty(), "30d": empty() }, impressionsSince: null };

  const supabase = createSupabaseAdminClient();
  if (!supabase) return emptyStats;

  const now = Date.now();
  const cutoff = new Date(now - 30 * DAY).toISOString();
  const [impressions, clicks] = await Promise.all([
    fetchAllRows<Row>((from, to) =>
      supabase
        .from("affiliate_impressions")
        .select("product_id, article_slug, created_at")
        .like("article_slug", "deals-%")
        .eq("is_bot", false)
        .gte("created_at", cutoff)
        .range(from, to)
    ),
    fetchAllRows<Row>((from, to) =>
      supabase
        .from("affiliate_clicks")
        .select("product_id, article_slug, created_at")
        .like("article_slug", "deals-%")
        .eq("is_bot", false)
        .gte("created_at", cutoff)
        .range(from, to)
    ),
  ]);

  const ids = [...new Set([...impressions, ...clicks].map((r) => r.product_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("affiliate_products").select("id, name").in("id", ids);
    for (const p of data ?? []) names.set(p.id, p.name);
  }

  const firstImpression = impressions.reduce<string | null>(
    (min, r) => (min === null || r.created_at < min ? r.created_at : min),
    null
  );

  return {
    windows: {
      "7d": summarize(impressions, clicks, now - 7 * DAY, names),
      "30d": summarize(impressions, clicks, now - 30 * DAY, names),
    },
    impressionsSince: firstImpression,
  };
}
