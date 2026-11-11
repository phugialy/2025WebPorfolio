"use client";

import { useEffect, useState } from "react";
import type { SearchDemand } from "@/lib/deals-search-log";

type Loaded = SearchDemand & { unavailable: boolean };

// What shoppers typed into the Deals search over the last 30 days, and the words
// we could not answer. This is the clearest list of products to add next, and the
// stream radar reads the same log.
export function DealsSearchPanel() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/deals/searches", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Could not load searches.");
        if (!cancelled) setData(body as Loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load searches.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="deals-searches" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="deals-searches" className="text-lg font-semibold tracking-tight">
        What shoppers search for and cannot find
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Words typed into the Deals search in the last 30 days that had no exact answer. A word near the top is a product to add. Bots are left out.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!data && !error && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}
      {data?.unavailable && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Search logging is not set up yet. Run migration 0025_deals_search_terms.sql and searches will appear here.
        </p>
      )}

      {data && !data.unavailable && (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            {data.total === 0
              ? "No searches recorded yet."
              : `${data.total.toLocaleString()} searches, ${data.answeredShare === null ? "n/a" : `${Math.round(data.answeredShare * 100)}%`} answered exactly.`}
          </p>
          {data.gaps.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Searched</th>
                    <th className="px-2 py-1.5 text-right font-medium">Times</th>
                    <th className="px-2 py-1.5 text-right font-medium">No match</th>
                    <th className="px-2 py-1.5 text-right font-medium">Close only</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Last</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.gaps.map((row) => (
                    <tr key={row.term} className="border-t border-border">
                      <td className="py-1.5 pr-3">{row.term}</td>
                      <td className="px-2 py-1.5 text-right">{row.searches}</td>
                      <td className="px-2 py-1.5 text-right">{row.unanswered}</td>
                      <td className="px-2 py-1.5 text-right">{row.partial}</td>
                      <td className="py-1.5 pl-2 text-right">{new Date(row.lastSeen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
