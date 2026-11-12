// Real-world demand for a product type, as relative Google search interest.
// Pure logic plus network calls that take their fetch as an argument, so it
// runs under Vitest with no setup.
//
// What this is and is not: Google Trends gives interest on a 0-100 scale that
// is only comparable INSIDE one request, and whole points at that, so a term
// far smaller than the biggest one in its request is coarse. It is not a search
// volume. To compare product types across requests, every request carries the
// same anchor term (a product type the site already serves) and each term is
// reported as a ratio of that anchor: 0.5 means "about half the interest in
// laptops".
//
// There is no official self-serve Google Trends API (it is an application-only
// alpha), so this reads SerpApi's google_trends engine when SERPAPI_KEY is set.
// With no key it returns nothing and callers fall back to an even split.
//
// Two windows, because the level and the direction are different questions:
//   baseline  the last 3 months: how big the demand is, stable day to day
//   recent    the last 7 days: is it heating up faster than laptops are
// The spend is planned day by day (see dailyPlan): 3 searches a day.

export const ANCHOR_TERM = "laptop";
export const TERMS_PER_REQUEST = 4; // plus the anchor: the engine takes at most 5 queries

// The SerpApi free plan allows 250 searches a month. The job keeps RESERVE_SEARCHES
// back for testing, retries and anything manual, and asks the account (a free
// call) how many are really left before it spends today's.
export const MONTHLY_SEARCHES = 250;
export const RESERVE_SEARCHES = 40;

export type DemandWindow = "baseline" | "recent";
const WINDOW_PARAM: Record<DemandWindow, string> = { baseline: "today 3-m", recent: "now 7-d" };

export type DemandResult = {
  source: "serpapi";
  fetchedAt: string;
  anchor: string;
  /** Which window the ratios describe. Rows stored before windows existed are baseline. */
  window?: DemandWindow;
  /** The terms this one request covered (the anchor is always in it too). */
  terms: string[];
  /** term -> interest as a multiple of the anchor's interest */
  ratios: Record<string, number>;
};

export function chunkTerms(terms: string[], size: number = TERMS_PER_REQUEST): string[][] {
  const unique = [...new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean))].filter((t) => t !== ANCHOR_TERM);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) chunks.push(unique.slice(i, i + size));
  return chunks;
}

type TimelinePoint = { values?: { query?: string; value?: string | number; extracted_value?: number }[] };

/** The mean interest of each query over the timeline in one response. */
export function meanInterest(json: unknown): Record<string, number> {
  const timeline = (json as { interest_over_time?: { timeline_data?: TimelinePoint[] } } | null)?.interest_over_time?.timeline_data;
  if (!Array.isArray(timeline)) return {};
  const sums = new Map<string, { total: number; n: number }>();
  for (const point of timeline) {
    for (const v of point.values ?? []) {
      if (!v.query) continue;
      const raw = typeof v.extracted_value === "number" ? v.extracted_value : Number(v.value);
      if (!Number.isFinite(raw)) continue;
      const key = v.query.trim().toLowerCase();
      const entry = sums.get(key) ?? { total: 0, n: 0 };
      entry.total += raw;
      entry.n += 1;
      sums.set(key, entry);
    }
  }
  return Object.fromEntries([...sums].map(([q, { total, n }]) => [q, total / n]));
}

/** Each term's mean as a multiple of the anchor's. Empty when the anchor had no interest to divide by. */
export function ratiosAgainstAnchor(means: Record<string, number>, anchor: string = ANCHOR_TERM): Record<string, number> {
  const base = means[anchor];
  if (!base || base <= 0) return {};
  const out: Record<string, number> = {};
  for (const [term, mean] of Object.entries(means)) {
    if (term === anchor) continue;
    out[term] = Math.round((mean / base) * 100) / 100;
  }
  return out;
}

export type PlannedSearch = { window: DemandWindow; chunk: string[] };

/**
 * Today's searches: the last-7-days window for every group of the terms that
 * matter most day to day (`recentTerms`, the products on the test shelves), plus
 * a 3-month baseline for ONE group of `baselineTerms` (every product type the
 * discovery engine can search for), the groups taking turns by day. With two
 * recent groups that is three searches a day; the baseline of each of four
 * groups is refreshed every fourth day, which is plenty for a 3-month level.
 */
export function dailyPlan(recentTerms: string[], baselineTerms: string[], dayIndex: number): PlannedSearch[] {
  const plan: PlannedSearch[] = chunkTerms(recentTerms).map((chunk) => ({ window: "recent" as const, chunk }));
  const baselineChunks = chunkTerms(baselineTerms.length > 0 ? baselineTerms : recentTerms);
  if (baselineChunks.length > 0) {
    plan.push({ window: "baseline", chunk: baselineChunks[((dayIndex % baselineChunks.length) + baselineChunks.length) % baselineChunks.length] });
  }
  return plan;
}

/** One request: the anchor plus up to four terms. */
export async function fetchDemandChunk(
  chunk: string[],
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
  window: DemandWindow = "baseline"
): Promise<DemandResult | null> {
  if (chunk.length === 0) return null;
  const q = [ANCHOR_TERM, ...chunk].join(",");
  const url = `https://serpapi.com/search.json?engine=google_trends&data_type=TIMESERIES&geo=US&date=${encodeURIComponent(WINDOW_PARAM[window])}&q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Trends request failed (${response.status})`);
  const ratios = ratiosAgainstAnchor(meanInterest(await response.json()));
  if (Object.keys(ratios).length === 0) return null;
  return { source: "serpapi", fetchedAt: new Date(now).toISOString(), anchor: ANCHOR_TERM, window, terms: chunk, ratios };
}

/** How many searches the account has left this month. A free call (it does not spend a search). Null when unreadable. */
export async function searchesLeft(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<number | null> {
  try {
    const response = await fetchImpl(`https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) return null;
    const json = (await response.json()) as { plan_searches_left?: unknown; total_searches_left?: unknown };
    const left = typeof json.total_searches_left === "number" ? json.total_searches_left : json.plan_searches_left;
    return typeof left === "number" ? left : null;
  } catch {
    return null;
  }
}

/** Every term's most recent ratio in one window, across all the requests so far (newer wins). */
export function mergeDemand(results: DemandResult[], window: DemandWindow = "baseline"): Record<string, number> {
  const merged: Record<string, number> = {};
  const inWindow = results.filter((r) => (r.window ?? "baseline") === window);
  for (const r of [...inWindow].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt))) Object.assign(merged, r.ratios);
  return merged;
}

/** Every term's blended demand from the stored `demand` rows' JSON notes (unreadable rows are skipped). */
export function blendStoredDemand(notes: (string | null | undefined)[]): Record<string, number> {
  const results: DemandResult[] = [];
  for (const note of notes) {
    if (!note) continue;
    try {
      results.push(JSON.parse(note) as DemandResult);
    } catch {
      // a row we cannot read is left out
    }
  }
  return blendDemand(mergeDemand(results, "baseline"), mergeDemand(results, "recent"));
}

export const MOMENTUM_MIN = 0.75;
export const MOMENTUM_MAX = 1.5;

/**
 * Demand to allocate by: the 3-month level, nudged by whether the last 7 days
 * run hotter or cooler than that level (both measured against laptops). The
 * nudge is capped to 0.75x-1.5x because whole-point rounding makes a week of
 * small numbers noisy. A term with no recent reading keeps its baseline.
 */
export function blendDemand(baseline: Record<string, number>, recent: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [term, level] of Object.entries(baseline)) {
    const week = recent[term];
    const momentum = level > 0 && typeof week === "number" ? Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_MIN, week / level)) : 1;
    out[term] = Math.round(level * momentum * 1000) / 1000;
  }
  return out;
}

/** A category's demand: its strongest term. Categories with no measured term are left out. */
export function demandByCategory(
  ratios: Record<string, number>,
  termsByCategory: Record<string, string[]>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [category, terms] of Object.entries(termsByCategory)) {
    const found = terms.map((t) => ratios[t.trim().toLowerCase()]).filter((v): v is number => typeof v === "number");
    if (found.length > 0) out[category] = Math.max(...found);
  }
  return out;
}
