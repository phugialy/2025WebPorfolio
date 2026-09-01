import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAffiliateClickStats, listAffiliateProducts } from "@/lib/affiliate";

type ArticlePerformance = {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string | null;
  daysSincePublished: number;
  viewsPerDay: number;
};

function daysSince(iso: string | null): number {
  if (!iso) return 1;
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, days);
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
        viewsPerDay: Math.round((( a.views || 0) / days) * 100) / 100,
      };
    });

    const totalViews = articles.reduce((sum, a) => sum + a.views, 0);
    const topByViews = [...articles].sort((a, b) => b.views - a.views);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // "Article of the week/month" isn't a real time-windowed metric -- `views`
    // is a lifetime running total with no historical snapshots, so this can
    // only mean "of the articles published in this window, which has the
    // most views" -- an honest proxy, not true in-window traffic.
    const publishedThisWeek = articles.filter((a) => a.publishedAt && a.publishedAt >= sevenDaysAgo);
    const publishedThisMonth = articles.filter((a) => a.publishedAt && a.publishedAt >= thirtyDaysAgo);
    const articleOfWeek = [...publishedThisWeek].sort((a, b) => b.views - a.views)[0] || null;
    const articleOfMonth = [...publishedThisMonth].sort((a, b) => b.views - a.views)[0] || null;

    const [clickStats, products] = await Promise.all([getAffiliateClickStats(), listAffiliateProducts()]);

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
      top5Articles: topByViews.slice(0, 5),
      top10Articles: topByViews.slice(0, 10),
      articleOfWeek,
      articleOfMonth,
      top5Products: clickStats.byProduct.slice(0, 5),
      fullProductList,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
