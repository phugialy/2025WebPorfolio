"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { Thumbnail, formatDate } from "@/components/affiliate/admin-ui";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string | null;
  daysSincePublished: number;
  viewsPerDay: number;
};

type ProductRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
  category: string | null;
  network: string;
  imageUrl: string | null;
  clicks: number;
  impressions: number;
  ctr: number | null;
  lastClickAt: string | null;
};

type ProductLeaderboardRow = {
  productId: string;
  productName: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  lastClickAt: string;
};

type Report = {
  overview: {
    totalArticles: number;
    totalViews: number;
    totalClicks: number;
    totalImpressions: number;
    overallCtr: number | null;
  };
  top5Articles: ArticleRow[];
  top10Articles: ArticleRow[];
  articleOfWeek: ArticleRow | null;
  articleOfMonth: ArticleRow | null;
  top5Products: ProductLeaderboardRow[];
  fullProductList: ProductRow[];
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {sub && <CardDescription>{sub}</CardDescription>}
      </CardHeader>
    </Card>
  );
}

function ArticleTable({ rows }: { rows: ArticleRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No published articles yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Article</th>
            <th className="py-2 pr-3 text-right">Views</th>
            <th className="py-2 pr-3 text-right">Views/day</th>
            <th className="py-2 pr-3 text-right">Published</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b last:border-0">
              <td className="max-w-xs truncate py-2 pr-3">
                <Link href={`/blog/${a.slug}`} className="hover:underline" title={a.title} target="_blank">
                  {a.title}
                </Link>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{a.views.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{a.viewsPerDay}</td>
              <td className="py-2 pr-3 text-right text-muted-foreground">
                {a.publishedAt ? formatDate(a.publishedAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArticleSpotlight({ label, article }: { label: string; article: ArticleRow | null }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        {article ? (
          <>
            <CardTitle className="text-base leading-snug">
              <Link href={`/blog/${article.slug}`} className="hover:underline" target="_blank">
                {article.title}
              </Link>
            </CardTitle>
            <CardDescription>
              {article.views.toLocaleString()} views · {article.viewsPerDay}/day since published
            </CardDescription>
          </>
        ) : (
          <CardDescription>Nothing published in this window yet.</CardDescription>
        )}
      </CardHeader>
    </Card>
  );
}

export function PerformanceBoard() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/performance")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReport(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Performance report: visits, click-through, and top performers across articles and
          affiliate assets. Bot traffic already excluded from every click/impression number.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="performance" />
        </div>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}
        {error && <p className="mt-8 text-destructive">Error: {error}</p>}

        {report && (
          <div className="mt-8 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total views" value={report.overview.totalViews.toLocaleString()} sub={`${report.overview.totalArticles} published articles`} />
              <StatCard label="Affiliate clicks" value={report.overview.totalClicks.toLocaleString()} />
              <StatCard label="Pick impressions" value={report.overview.totalImpressions.toLocaleString()} />
              <StatCard
                label="Overall CTR"
                value={report.overview.overallCtr !== null ? `${(report.overview.overallCtr * 100).toFixed(1)}%` : "—"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ArticleSpotlight label="Article of the week" article={report.articleOfWeek} />
              <ArticleSpotlight label="Article of the month" article={report.articleOfMonth} />
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              &quot;Of the week/month&quot; means the most-viewed article among those published in
              that window -- views are a lifetime running total with no historical snapshots, so
              this can&apos;t mean &quot;most traffic during the week&quot; the way a real
              analytics tool would.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 articles by views</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <ArticleTable rows={report.top5Articles} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 articles by views</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <ArticleTable rows={report.top10Articles} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 products by clicks</CardTitle>
              </CardHeader>
              <div className="grid gap-2 px-6 pb-6">
                {report.top5Products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clicks yet.</p>
                ) : (
                  report.top5Products.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2">{p.productName}</span>
                      <span className="flex-none text-muted-foreground">
                        {p.clicks} clicks / {p.impressions} shown
                        {p.ctr !== null ? ` · ${(p.ctr * 100).toFixed(1)}% CTR` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Full product list ({report.fullProductList.length})</CardTitle>
                <CardDescription>Every asset in the catalog, active and inactive, with performance.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3 text-right">Clicks</th>
                      <th className="py-2 pr-3 text-right">Impressions</th>
                      <th className="py-2 pr-3 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.fullProductList.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Thumbnail src={p.imageUrl} alt={p.name} />
                            <Link
                              href={`/admin/affiliate/products/${p.id}`}
                              className="max-w-[220px] truncate hover:underline"
                              title={p.name}
                            >
                              {p.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={
                              p.status === "active"
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{p.category || "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{p.clicks}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{p.impressions}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {p.ctr !== null ? `${(p.ctr * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average reading time -- not tracked yet</CardTitle>
                <CardDescription>
                  Nothing in this codebase measures time-on-page today. GA4 already computes this
                  for free with zero new code: Reports → Engagement → Pages and screens →
                  &quot;Average engagement time&quot; per URL. Pulling it into this report instead
                  would mean a real new integration (the GA4 Data API) -- worth doing only if you
                  want it here specifically rather than in the GA4 dashboard you already have.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
