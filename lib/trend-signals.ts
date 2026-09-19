export type TrendKeyword = { keyword: string; source: "placeholder" | string };

/**
 * Stub until a real trends provider is chosen -- there's no official Google
 * Trends API; the real options are an unofficial scraper (free, fragile,
 * ToS-risk) or a paid reseller like SerpApi/DataForSEO, and picking between
 * them is a cost/reliability call for the site owner, not this code.
 *
 * Returns the category name itself as the only "trending" keyword so the
 * rest of the discovery pipeline (Canopy search, quality filter, LLM fit
 * evaluation, curation) is fully exercised end-to-end today. Swapping in a
 * real provider means rewriting only this function -- every caller depends
 * solely on this signature.
 */
export async function getTrendingKeywords(category: string, limit = 1): Promise<TrendKeyword[]> {
  return [{ keyword: category, source: "placeholder" }].slice(0, limit);
}
