"use client";

import { useEffect, useState } from "react";
import type { BrandStats } from "@/lib/brand-stats";
import { MIN_VIEWS } from "@/lib/brand-stats-core";

type WindowKey = "7d" | "30d";

const pct = (value: number | null) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);
const shortDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The Insta360 brand page on its own: which cards people saw and opened
// (sweepers and bots out), cameras against accessories, what Google Search
// sends it, and where its page views live (Google Analytics).
export function Insta360StatsPanel() {
  const [stats, setStats] = useState<BrandStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("7d");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/deals/insta360-stats", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load the Insta360 numbers.");
        if (!cancelled) setStats(data as BrandStats);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the Insta360 numbers.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = stats?.windows[windowKey];
  const search = stats?.search["28d"];

  return (
    <section aria-labelledby="insta360-results" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="insta360-results" className="text-lg font-semibold tracking-tight">
            How the Insta360 page is doing
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            <a href="/deals/insta360" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
              /deals/insta360
            </a>
            : cards seen and opened, with bots and link-checkers left out.
            {stats?.firstSeen ? ` First card seen ${shortDate(stats.firstSeen)}.` : " No card has been seen yet."} Read nothing into a card
            under {MIN_VIEWS} views.
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

      {current && stats && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Cards seen</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{current.seen.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Opened</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{current.opened.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">Share opened</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{pct(current.ctr)}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">From Google Search</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{search ? search.clicks.toLocaleString() : "n/a"}</dd>
              <dd className="text-xs text-muted-foreground">
                {search
                  ? `clicks from ${search.impressions.toLocaleString()} search views, 28 days to ${shortDate(stats.search.through)}`
                  : "Search Console did not answer"}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-sm text-muted-foreground">
            Page views and where visitors came from are in Google Analytics: Reports, then Pages and screens, filtered to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/deals/insta360</code>.{" "}
            <a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
              Open Google Analytics
            </a>
            {current.sweeperClicksDropped > 0 &&
              ` ${current.sweeperClicksDropped} ${current.sweeperClicksDropped === 1 ? "click" : "clicks"} from link-checkers left out.`}
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold">By card</h3>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Card</th>
                    <th className="px-2 py-1.5 text-right font-medium">Seen</th>
                    <th className="px-2 py-1.5 text-right font-medium">Opened</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {(["camera", "accessory"] as const).map((group) => {
                    const total = current.groups[group];
                    return [
                      <tr key={`${group}-total`} className="border-t border-border bg-muted/40 font-semibold">
                        <td className="py-1.5 pr-3">{group === "camera" ? "Cameras" : "Accessories"}</td>
                        <td className="px-2 py-1.5 text-right">{total.seen}</td>
                        <td className="px-2 py-1.5 text-right">{total.opened}</td>
                        <td className="py-1.5 pl-2 text-right">{pct(total.ctr)}</td>
                      </tr>,
                      ...current.cards
                        .filter((card) => card.group === group)
                        .map((card) => (
                          <tr key={card.id} className="border-t border-border">
                            <td className="max-w-[18rem] truncate py-1.5 pl-3 pr-3" title={card.name}>
                              {card.name}
                            </td>
                            <td className="px-2 py-1.5 text-right">{card.seen}</td>
                            <td className="px-2 py-1.5 text-right">{card.opened}</td>
                            <td className="py-1.5 pl-2 text-right text-muted-foreground">
                              {card.enoughViews ? <span className="text-foreground">{pct(card.ctr)}</span> : "too few views"}
                            </td>
                          </tr>
                        )),
                    ];
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <div className="min-w-0 overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold">By day</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Day</th>
                      <th className="px-2 py-1.5 text-right font-medium">Seen</th>
                      <th className="py-1.5 pl-2 text-right font-medium">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[...current.days].reverse().map((day) => (
                      <tr key={day.day} className="border-t border-border">
                        <td className="py-1.5 pr-3">{shortDate(day.day)}</td>
                        <td className="px-2 py-1.5 text-right">{day.seen}</td>
                        <td className="py-1.5 pl-2 text-right">{day.opened}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold">Google searches that showed the page (28 days)</h3>
                {stats.search.error ? (
                  <p className="text-sm text-muted-foreground">Search Console did not answer: {stats.search.error}</p>
                ) : !search || search.queries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None yet. Search Console runs about two days behind, and a new page takes a while to be shown.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-1.5 pr-3 font-medium">Search</th>
                        <th className="px-2 py-1.5 text-right font-medium">Shown</th>
                        <th className="px-2 py-1.5 text-right font-medium">Clicks</th>
                        <th className="py-1.5 pl-2 text-right font-medium">Position</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {search.queries.map((q) => (
                        <tr key={q.query} className="border-t border-border">
                          <td className="max-w-[14rem] truncate py-1.5 pr-3" title={q.query}>
                            {q.query}
                          </td>
                          <td className="px-2 py-1.5 text-right">{q.impressions}</td>
                          <td className="px-2 py-1.5 text-right">{q.clicks}</td>
                          <td className="py-1.5 pl-2 text-right">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
