import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/affiliate";
import { AMBIT_BRAND } from "@/lib/ambit-brand";

// Every Ambit placement logs impressions and clicks under a fixed label (the
// click `ref` and the impression label are the same string), so per-placement
// CTR is a straight join on that label. Any label not listed here is an
// article slug -- the inline callout on an energy/household article.
export const AMBIT_PLACEMENTS: Record<string, string> = {
  "homepage-ambit-card": "Homepage: info card",
  "homepage-ambit-save": "Homepage: save-energy paragraph",
  "blog-index-ambit": "Blog index: banner",
  "energy-hub": "Energy hub: banner",
  "resources-page": "Resources page: info card",
};
const ARTICLES_LABEL = "Article pages: inline callout";

export type PlacementRow = { key: string; label: string; impressions: number; clicks: number; ctr: number | null };
export type WindowKey = "7d" | "30d" | "all";
export type AmbitStats = {
  product: { id: string; status: string } | null;
  windows: Record<WindowKey, { rows: PlacementRow[]; impressions: number; clicks: number; ctr: number | null }>;
  articles: Array<{ slug: string; title: string | null; impressions: number; clicks: number; ctr: number | null }>;
};

type Row = { article_slug: string | null; created_at: string };

const DAY = 24 * 60 * 60 * 1000;
const ratio = (clicks: number, impressions: number) => (impressions > 0 ? clicks / impressions : null);

function summarize(impressions: Row[], clicks: Row[], since: number | null) {
  const inWindow = (row: Row) => since === null || new Date(row.created_at).getTime() >= since;
  const by = new Map<string, { impressions: number; clicks: number }>();
  const bucket = (slug: string | null) => {
    const key = slug && AMBIT_PLACEMENTS[slug] ? slug : "articles";
    if (!by.has(key)) by.set(key, { impressions: 0, clicks: 0 });
    return by.get(key)!;
  };
  for (const row of impressions) if (inWindow(row)) bucket(row.article_slug).impressions += 1;
  for (const row of clicks) if (inWindow(row)) bucket(row.article_slug).clicks += 1;

  const keys = [...Object.keys(AMBIT_PLACEMENTS), "articles"];
  const rows: PlacementRow[] = keys.map((key) => {
    const v = by.get(key) ?? { impressions: 0, clicks: 0 };
    return {
      key,
      label: key === "articles" ? ARTICLES_LABEL : AMBIT_PLACEMENTS[key],
      ...v,
      ctr: ratio(v.clicks, v.impressions),
    };
  });
  const impressionsTotal = rows.reduce((n, r) => n + r.impressions, 0);
  const clicksTotal = rows.reduce((n, r) => n + r.clicks, 0);
  return { rows, impressions: impressionsTotal, clicks: clicksTotal, ctr: ratio(clicksTotal, impressionsTotal) };
}

export async function getAmbitStats(): Promise<AmbitStats> {
  const empty = (): AmbitStats["windows"][WindowKey] => ({ rows: [], impressions: 0, clicks: 0, ctr: null });
  const emptyStats: AmbitStats = {
    product: null,
    windows: { "7d": empty(), "30d": empty(), all: empty() },
    articles: [],
  };

  const supabase = createSupabaseAdminClient();
  if (!supabase) return emptyStats;

  const { data: product } = await supabase
    .from("affiliate_products")
    .select("id, status")
    .eq("brand", AMBIT_BRAND)
    .limit(1)
    .maybeSingle();
  if (!product) return emptyStats;

  // Bots are excluded from both sides, the same rule the other CTR numbers use.
  const [impressions, clicks] = await Promise.all([
    fetchAllRows<Row>((from, to) =>
      supabase
        .from("affiliate_impressions")
        .select("article_slug, created_at")
        .eq("product_id", product.id)
        .eq("is_bot", false)
        .range(from, to)
    ),
    fetchAllRows<Row>((from, to) =>
      supabase
        .from("affiliate_clicks")
        .select("article_slug, created_at")
        .eq("product_id", product.id)
        .eq("is_bot", false)
        .range(from, to)
    ),
  ]);

  const now = Date.now();
  const perArticle = new Map<string, { impressions: number; clicks: number }>();
  const touch = (slug: string) => {
    if (!perArticle.has(slug)) perArticle.set(slug, { impressions: 0, clicks: 0 });
    return perArticle.get(slug)!;
  };
  for (const row of impressions) if (row.article_slug && !AMBIT_PLACEMENTS[row.article_slug]) touch(row.article_slug).impressions += 1;
  for (const row of clicks) if (row.article_slug && !AMBIT_PLACEMENTS[row.article_slug]) touch(row.article_slug).clicks += 1;

  const slugs = [...perArticle.keys()];
  const titles = new Map<string, string>();
  if (slugs.length > 0) {
    const { data } = await supabase.from("articles").select("slug, title").in("slug", slugs);
    for (const a of data ?? []) titles.set(a.slug, a.title);
  }

  return {
    product: { id: product.id, status: product.status },
    windows: {
      "7d": summarize(impressions, clicks, now - 7 * DAY),
      "30d": summarize(impressions, clicks, now - 30 * DAY),
      all: summarize(impressions, clicks, null),
    },
    articles: [...perArticle.entries()]
      .map(([slug, v]) => ({ slug, title: titles.get(slug) ?? null, ...v, ctr: ratio(v.clicks, v.impressions) }))
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 15),
  };
}
