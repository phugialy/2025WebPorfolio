import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAffiliateClickStats, listAffiliateProducts } from "@/lib/affiliate";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type ArticlePerformance = {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string | null;
  daysSincePublished: number;
  viewsPerDay: number;
};

type ProductLeaderboardRow = {
  productId: string;
  productName: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
};

function daysSince(iso: string | null): number {
  if (!iso) return 1;
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, days);
}

function topArticlesInWindow(articles: ArticlePerformance[], days: number, limit: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return [...articles]
    .filter((a) => a.publishedAt && a.publishedAt >= cutoff)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Unlike article views (a lifetime running total with no history), clicks
 * and impressions are individually timestamped rows -- so this is a real
 * time-windowed metric, not a published-in-window proxy like the article
 * side has to use.
 */
async function topProductsInWindow(
  supabase: AdminClient,
  days: number,
  limit: number
): Promise<ProductLeaderboardRow[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: clicks }, { data: impressions }, { data: products }] = await Promise.all([
    supabase.from("affiliate_clicks").select("product_id").eq("is_bot", false).gte("created_at", cutoff),
    supabase.from("affiliate_impressions").select("product_id").eq("is_bot", false).gte("created_at", cutoff),
    supabase.from("affiliate_products").select("id, name"),
  ]);

  const nameById = new Map((products || []).map((p) => [p.id, p.name as string]));
  const clickCount = new Map<string, number>();
  for (const c of clicks || []) {
    if (c.product_id) clickCount.set(c.product_id, (clickCount.get(c.product_id) || 0) + 1);
  }
  const impCount = new Map<string, number>();
  for (const i of impressions || []) {
    if (i.product_id) impCount.set(i.product_id, (impCount.get(i.product_id) || 0) + 1);
  }

  const ids = new Set([...clickCount.keys(), ...impCount.keys()]);
  return [...ids]
    .map((id) => {
      const clicksN = clickCount.get(id) || 0;
      const impN = impCount.get(id) || 0;
      return {
        productId: id,
        productName: nameById.get(id) || "Deleted product",
        clicks: clicksN,
        impressions: impN,
        ctr: impN > 0 ? clicksN / impN : null,
      };
    })
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase write config is missing" }, { status: 500 });
  }

  try {
    const { data: rows, error } = await supabase
      .from("articles")
      .select("id, title, slug, views, published_at")
      .eq("status", "published");

    if (error) throw error;

    const articles: ArticlePerformance[] = (rows || []).map((a) => {
      const days = daysSince(a.published_at);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        views: a.views || 0,
        publishedAt: a.published_at,
        daysSincePublished: Math.round(days),
        viewsPerDay: Math.round(((a.views || 0) / days) * 100) / 100,
      };
    });

    const totalViews = articles.reduce((sum, a) => sum + a.views, 0);

    const [clickStats, products, dailyTopProducts, monthlyTopProducts] = await Promise.all([
      getAffiliateClickStats(),
      listAffiliateProducts(),
      topProductsInWindow(supabase, 1, 10),
      topProductsInWindow(supabase, 30, 10),
    ]);

    const clicksByProduct = new Map(clickStats.byProduct.map((p) => [p.productId, p]));
    const fullProductList = products.map((product) => {
      const perf = clicksByProduct.get(product.id);
      return {
        id: product.id,
        name: product.name,
        status: product.status,
        category: product.category,
        network: product.network,
        imageUrl: product.image_url,
        clicks: perf?.clicks || 0,
        impressions: perf?.impressions || 0,
        ctr: perf?.ctr ?? null,
        lastClickAt: perf?.lastClickAt || null,
      };
    });

    return NextResponse.json({
      overview: {
        totalArticles: articles.length,
        totalViews,
        totalClicks: clickStats.totalClicks,
        totalImpressions: clickStats.totalImpressions,
        overallCtr: clickStats.totalImpressions > 0 ? clickStats.totalClicks / clickStats.totalImpressions : null,
      },
      daily: {
        topArticles: topArticlesInWindow(articles, 1, 10),
        topProducts: dailyTopProducts,
      },
      monthly: {
        topArticles: topArticlesInWindow(articles, 30, 10),
        topProducts: monthlyTopProducts,
      },
      fullProductList,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
