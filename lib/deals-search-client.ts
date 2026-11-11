"use client";

import type { SearchTier } from "@/lib/deals-search";

// Tells the server what a shopper searched for and how it went, once they stop
// typing. The same word is sent at most once per tab session, so retyping does
// not count twice. Fire and forget: the page never waits on it.
const sent = new Set<string>();

export function reportDealsSearch(term: string, tier: SearchTier, resultCount: number) {
  if (typeof window === "undefined") return;
  const key = `${term}|${tier}`;
  if (sent.has(key)) return;
  sent.add(key);
  fetch("/api/deals/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term, tier, resultCount }),
    keepalive: true,
  }).catch(() => {});
}
