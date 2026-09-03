"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

type NearMiss = { query: string; page: string; clicks: number; impressions: number; ctr: number; position: number };

type Report = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  totals: { clicks: number; impressions: number; ctr: number | null; avgPosition: number | null };
  topQueries: GscRow[];
  topPages: GscRow[];
  nearMissOpportunities: NearMiss[];
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function SeoBoard() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/seo?days=90")
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
        <h1 className="mt-2 font-display text-4xl font-bold">SEO Audit</h1>
        <p className="mt-3 text-muted-foreground">
          Real Google Search Console data for the last 90 days -- actual queries, pages, and
          ranking opportunities, not an estimate.
        </p>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}
        {error && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Couldn&apos;t load GSC data</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {report && (
          <div className="mt-8 grid gap-6">
            <p className="text-xs text-muted-foreground">
              Property: <code>{report.siteUrl}</code> · {report.startDate} to {report.endDate}. Only
              the domain property is queryable today -- the two URL-prefix properties
              (https://phugialy.com/, https://www.phugialy.com/) return 403 because the service
              account only has Search Console access on the domain property. Add it as a user on
              those properties in Search Console settings to unlock them here too.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Clicks (90d)" value={report.totals.clicks.toLocaleString()} />
              <StatCard label="Impressions (90d)" value={report.totals.impressions.toLocaleString()} />
              <StatCard
                label="Avg CTR"
                value={report.totals.ctr !== null ? `${(report.totals.ctr * 100).toFixed(2)}%` : "—"}
              />
              <StatCard
                label="Avg position"
                value={report.totals.avgPosition !== null ? report.totals.avgPosition.toFixed(1) : "—"}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Near-miss opportunities</CardTitle>
                <CardDescription>
                  Real queries with real search volume, ranking just off page 1 (position 8-20) --
                  the highest-leverage places to improve a title or meta description, since Google
                  is already showing the page for these, just not high enough.
                </CardDescription>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                {report.nearMissOpportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None found in this window -- either everything&apos;s already on page 1, or
                    there isn&apos;t enough query volume yet to surface one.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Query</th>
                        <th className="py-2 pr-3">Page</th>
                        <th className="py-2 pr-3 text-right">Impressions</th>
                        <th className="py-2 pr-3 text-right">Clicks</th>
                        <th className="py-2 pr-3 text-right">CTR</th>
                        <th className="py-2 pr-3 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.nearMissOpportunities.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{r.query}</td>
                          <td className="max-w-xs truncate py-2 pr-3">
                            <Link href={r.page} target="_blank" className="text-primary hover:underline">
                              {r.page.replace(/^https?:\/\/[^/]+/, "")}
                            </Link>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{r.impressions}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{r.clicks}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{(r.ctr * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{r.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top queries</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Query</th>
                      <th className="py-2 pr-3 text-right">Clicks</th>
                      <th className="py-2 pr-3 text-right">Impressions</th>
                      <th className="py-2 pr-3 text-right">CTR</th>
                      <th className="py-2 pr-3 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topQueries.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{r.keys[0]}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.clicks}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.impressions}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{(r.ctr * 100).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top pages</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Page</th>
                      <th className="py-2 pr-3 text-right">Clicks</th>
                      <th className="py-2 pr-3 text-right">Impressions</th>
                      <th className="py-2 pr-3 text-right">CTR</th>
                      <th className="py-2 pr-3 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topPages.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="max-w-sm truncate py-2 pr-3">
                          <Link href={r.keys[0]} target="_blank" className="text-primary hover:underline">
                            {r.keys[0].replace(/^https?:\/\/[^/]+/, "")}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.clicks}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.impressions}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{(r.ctr * 100).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
