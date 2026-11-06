"use client";

import { useEffect, useState } from "react";
import type { DealsStats } from "@/lib/deals-stats";

type WindowKey = "7d" | "30d";

const pct = (value: number | null) => (value === null ? "no views yet" : `${(value * 100).toFixed(1)}%`);

// How each part of the Deals pages is doing: how many product cards were seen,
// how many were opened, and the share that were. Bots are excluded.
export function DealsStatsPanel() {
  const [stats, setStats] = useState<DealsStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("7d");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/deals/stats", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load results.");
        if (!cancelled) setStats(data as DealsStats);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load results.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = stats?.windows[windowKey];
  const since = stats?.impressionsSince ? new Date(stats.impressionsSince).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  return (
    <section aria-labelledby="deals-results" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="deals-results" className="text-lg font-semibold tracking-tight">
            How the Deals pages are doing
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cards that were on screen, cards that were opened, and the share opened. Bots are left out.
            {since ? ` Counting cards on screen began ${since}; earlier days show opens only.` : " Counting cards on screen starts with the next visit."}
          </p>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-2">
          {(["7d", "30d"] as WindowKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={windowKey === key}
              onClick={() => setWindowKey(key)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                windowKey === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"
              }`}
            >
              {key === "7d" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!stats && !error && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}

      {current && (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Cards seen</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{current.impressions.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Opened</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{current.clicks.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Share opened</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{pct(current.ctr)}</dd>
            </div>
          </dl>

          {current.sections.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing recorded in this range yet.</p>
          ) : (
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="min-w-0 overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold">By section</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Section</th>
                      <th className="px-2 py-1.5 text-right font-medium">Seen</th>
                      <th className="px-2 py-1.5 text-right font-medium">Opened</th>
                      <th className="py-1.5 pl-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {current.sections.map((row) => (
                      <tr key={row.ref} className="border-t border-border">
                        <td className="py-1.5 pr-3">{row.label}</td>
                        <td className="px-2 py-1.5 text-right">{row.impressions}</td>
                        <td className="px-2 py-1.5 text-right">{row.clicks}</td>
                        <td className="py-1.5 pl-2 text-right">{row.ctr === null ? "n/a" : `${(row.ctr * 100).toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="min-w-0 overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold">Most opened products</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Product</th>
                      <th className="px-2 py-1.5 text-right font-medium">Seen</th>
                      <th className="px-2 py-1.5 text-right font-medium">Opened</th>
                      <th className="py-1.5 pl-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {current.products.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="max-w-[16rem] truncate py-1.5 pr-3" title={row.name}>
                          {row.name}
                        </td>
                        <td className="px-2 py-1.5 text-right">{row.impressions}</td>
                        <td className="px-2 py-1.5 text-right">{row.clicks}</td>
                        <td className="py-1.5 pl-2 text-right">{row.ctr === null ? "n/a" : `${(row.ctr * 100).toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
