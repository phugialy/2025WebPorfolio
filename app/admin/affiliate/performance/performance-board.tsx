"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { formatDate } from "@/components/affiliate/admin-ui";
import type { AffiliateClickStats } from "@/lib/affiliate";

const EMPTY_CLICK_STATS: AffiliateClickStats = {
  totalClicks: 0,
  totalImpressions: 0,
  byProduct: [],
  byArticle: [],
  recent: [],
  botTotal: 0,
  botRecent: [],
};

function Leaderboard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; clicks: number; impressions: number; ctr: number | null; lastClickAt: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="grid gap-2 px-6 pb-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clicks yet.</p>
        ) : (
          rows.map((row, i) => (
            <div key={`${row.label}-${i}`} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2">{row.label}</span>
              <span className="flex-none text-muted-foreground">
                {row.clicks} clicks / {row.impressions} shown
                {row.ctr !== null ? ` · ${(row.ctr * 100).toFixed(1)}% CTR` : ""} · last{" "}
                {formatDate(row.lastClickAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function PerformanceBoard() {
  const [stats, setStats] = useState<AffiliateClickStats>(EMPTY_CLICK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/affiliate/clicks")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Outbound clicks, logged server-side on every redirect through /api/affiliate/go.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="performance" />
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {stats.totalClicks} clicks / {stats.totalImpressions} Pick impressions
                  {stats.totalImpressions > 0
                    ? ` · ${((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1)}% overall CTR`
                    : ""}
                </CardTitle>
                <CardDescription>Across every asset and article, bot traffic excluded.</CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Leaderboard
                title="Top articles by clicks"
                rows={stats.byArticle.map((a) => ({
                  label: a.articleTitle || a.articleSlug,
                  clicks: a.clicks,
                  impressions: a.impressions,
                  ctr: a.ctr,
                  lastClickAt: a.lastClickAt,
                }))}
              />
              <Leaderboard
                title="Top assets by clicks"
                rows={stats.byProduct.map((p) => ({
                  label: p.productName,
                  clicks: p.clicks,
                  impressions: p.impressions,
                  ctr: p.ctr,
                  lastClickAt: p.lastClickAt,
                }))}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <div className="grid gap-2 px-6 pb-6">
                {stats.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clicks yet.</p>
                ) : (
                  stats.recent.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2">
                        {r.productName} from {r.articleTitle || r.articleSlug || "unknown page"}
                      </span>
                      <span className="flex-none text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bot/crawler activity: {stats.botTotal}</CardTitle>
                <CardDescription>
                  Hits on the same redirect endpoint from known crawlers (link-preview bots,
                  scrapers) -- tracked separately, already excluded from every number above and
                  from the homepage ranking.
                </CardDescription>
              </CardHeader>
              {stats.botRecent.length > 0 && (
                <div className="grid gap-2 px-6 pb-6">
                  {stats.botRecent.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate pr-2">
                        {r.productName} · {r.articleSlug || "unknown page"} ·{" "}
                        <span className="italic">{r.userAgent?.slice(0, 40) || "no user agent"}</span>
                      </span>
                      <span className="flex-none">{formatDate(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
