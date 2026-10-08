"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { cn } from "@/lib/utils";
import type { AmbitStats, WindowKey } from "@/lib/ambit-stats";

const WINDOWS: Array<{ key: WindowKey; label: string }> = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

const pct = (ctr: number | null) => (ctr === null ? "n/a" : `${(ctr * 100).toFixed(1)}%`);

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

function StatsTable({
  firstColumn,
  rows,
}: {
  firstColumn: string;
  rows: Array<{ key: string; label: React.ReactNode; impressions: number; clicks: number; ctr: number | null }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 pr-3">{firstColumn}</th>
          <th className="py-2 pr-3 text-right">Shown</th>
          <th className="py-2 pr-3 text-right">Clicks</th>
          <th className="py-2 pr-3 text-right">CTR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b last:border-0">
            <td className="max-w-xs truncate py-2 pr-3">{row.label}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{row.clicks.toLocaleString()}</td>
            <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{pct(row.ctr)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AmbitBoard() {
  const [stats, setStats] = useState<AmbitStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("30d");

  useEffect(() => {
    fetch("/api/admin/ambit/stats")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Failed to load");
        setStats(body as AmbitStats);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const current = stats?.windows[windowKey];

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Ambit Energy placements: how often each banner and card is shown, clicked, and the
          click-through rate. Bot traffic is excluded.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="ambit" />
        </div>

        {!stats && !error && <p className="mt-8 text-muted-foreground">Loading...</p>}
        {error && <p className="mt-8 text-destructive">Error: {error}</p>}

        {stats && !stats.product && (
          <p className="mt-8 text-muted-foreground">No Ambit vendor row found yet.</p>
        )}

        {stats?.product && current && (
          <div className="mt-8 grid gap-6">
            {stats.product.status !== "active" && (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                The Ambit vendor is <strong className="text-foreground">inactive</strong>, so no
                placement is showing and nothing is being counted. Numbers start once it is
                activated.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWindowKey(w.key)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    windowKey === w.key
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-background hover:bg-white/[0.04]"
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Shown" value={current.impressions.toLocaleString()} />
              <StatCard label="Clicks to Ambit" value={current.clicks.toLocaleString()} />
              <StatCard label="Click-through rate" value={pct(current.ctr)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By placement</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                <StatsTable firstColumn="Placement" rows={current.rows} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Articles carrying the callout (all time)</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                {stats.articles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No article has shown the callout yet.</p>
                ) : (
                  <StatsTable
                    firstColumn="Article"
                    rows={stats.articles.map((a) => ({
                      key: a.slug,
                      label: (
                        <Link href={`/blog/${a.slug}`} target="_blank" className="hover:underline" title={a.title ?? a.slug}>
                          {a.title ?? a.slug}
                        </Link>
                      ),
                      impressions: a.impressions,
                      clicks: a.clicks,
                      ctr: a.ctr,
                    }))}
                  />
                )}
              </div>
            </Card>

            <p className="text-xs leading-relaxed text-muted-foreground">
              How to read this: &quot;Shown&quot; counts a page render for most placements, and a
              real on-screen view for the blog index banner, so the blog index CTR is the
              stricter number. Clicks are counted when the visitor is sent on to Ambit. They show
              interest in the offer, not sign-ups; enrollment happens on Ambit&apos;s side.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
