import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isLikelyBot } from "@/lib/bot-detection";
import { fetchAllRows } from "@/lib/affiliate";
import type { SearchTier } from "@/lib/deals-search";

// What shoppers search for on Deals, recorded so the site learns what it is
// missing. Only the words typed are kept (see migration 0025): no identifier of
// the visitor, and nothing that looks like contact details or a link.

export const TERM_MIN = 2;
export const TERM_MAX = 60;
const TIERS: readonly string[] = ["exact", "close", "none"];

// Normalizes a typed search for storage, or returns null when it should not be
// stored at all: too short or long, or it looks like an email, a link or a phone number.
export function cleanSearchTerm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const term = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (term.length < TERM_MIN || term.length > TERM_MAX) return null;
  if (/@|https?:|www\.|\.(com|net|org|io|co)\b/.test(term)) return null;
  if (/\d[\d\s().-]{6,}\d/.test(term)) return null; // a phone-number-like run of digits
  return term;
}

export function isSearchTier(value: unknown): value is SearchTier {
  return typeof value === "string" && TIERS.includes(value);
}

export async function logDealsSearch(input: { term: string; tier: SearchTier; resultCount: number; userAgent?: string | null }) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("deals_search_terms").insert({
    term: input.term,
    tier: input.tier,
    result_count: Math.max(0, Math.min(500, Math.floor(input.resultCount))),
    is_bot: isLikelyBot(input.userAgent),
  });
}

// ---------------------------------------------------------------------------
// Reading it back
// ---------------------------------------------------------------------------

export type SearchRow = { term: string; tier: SearchTier; created_at: string };
export type SearchDemandRow = { term: string; searches: number; unanswered: number; partial: number; lastSeen: string };
export type SearchDemand = {
  total: number; // settled searches in the window
  answeredShare: number | null; // share that had an exact answer
  // Terms people searched that the catalog could not answer exactly, most-searched first.
  gaps: SearchDemandRow[];
};

// Pure: group rows by term and rank the ones we could not answer.
export function summarizeSearches(rows: SearchRow[], limit = 15): SearchDemand {
  const byTerm = new Map<string, SearchDemandRow>();
  let exact = 0;
  for (const row of rows) {
    if (row.tier === "exact") exact += 1;
    const entry = byTerm.get(row.term) ?? { term: row.term, searches: 0, unanswered: 0, partial: 0, lastSeen: row.created_at };
    entry.searches += 1;
    if (row.tier === "none") entry.unanswered += 1;
    if (row.tier === "close") entry.partial += 1;
    if (row.created_at > entry.lastSeen) entry.lastSeen = row.created_at;
    byTerm.set(row.term, entry);
  }
  const gaps = [...byTerm.values()]
    .filter((e) => e.unanswered + e.partial > 0)
    .sort((a, b) => b.unanswered + b.partial - (a.unanswered + a.partial) || b.searches - a.searches || a.term.localeCompare(b.term))
    .slice(0, limit);
  return { total: rows.length, answeredShare: rows.length ? exact / rows.length : null, gaps };
}

export async function getSearchDemand(days = 30): Promise<SearchDemand & { unavailable: boolean }> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ...summarizeSearches([]), unavailable: false };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    const rows = await fetchAllRows<SearchRow>((from, to) =>
      supabase
        .from("deals_search_terms")
        .select("term, tier, created_at")
        .eq("is_bot", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, to)
    );
    return { ...summarizeSearches(rows), unavailable: false };
  } catch {
    // Most likely the migration has not been run yet: say so instead of showing an empty list as if nobody searched.
    return { ...summarizeSearches([]), unavailable: true };
  }
}
