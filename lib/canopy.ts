// Shared Canopy (Amazon product search) client -- used by both the
// gap-filling discovery job (lib/resource-discovery.ts) and the standing
// market-intelligence category scan (lib/market-intelligence.ts). Quality
// gate mirrors what the live test validated: sponsored placements are
// noise, rating + review count are the real signal.
export const MIN_RATING = 4.0;
export const MIN_REVIEWS = 20;

export type CanopySearchResult = {
  sponsored?: boolean;
  title: string;
  asin: string;
  mainImageUrl?: string;
  rating: number | null;
  ratingsTotal: number | null;
};

export async function searchCanopy(searchTerm: string): Promise<CanopySearchResult[]> {
  const apiKey = process.env.CANOPY_API_KEY;
  if (!apiKey) {
    throw new Error("CANOPY_API_KEY is not configured");
  }

  const response = await fetch(
    `https://rest.canopyapi.co/api/amazon/search?searchTerm=${encodeURIComponent(searchTerm)}`,
    { headers: { "API-KEY": apiKey } }
  );

  if (!response.ok) {
    throw new Error(`Canopy search failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.data?.amazonProductSearchResults?.productResults?.results || [];
}

/**
 * Filters out sponsored placements and anything below the quality bar, then
 * sorts best-first (rating, then review count as the tiebreaker). Returns
 * every qualifying result -- callers slice to however many they need (1 for
 * a single best pick, up to 10 for a market-scan proposal batch).
 */
export function filterQualityCandidates(results: CanopySearchResult[]): CanopySearchResult[] {
  return results
    .filter((r) => !r.sponsored)
    .filter((r) => typeof r.rating === "number" && r.rating >= MIN_RATING)
    .filter((r) => typeof r.ratingsTotal === "number" && r.ratingsTotal >= MIN_REVIEWS)
    .sort(
      (a, b) =>
        (b.rating as number) - (a.rating as number) ||
        (b.ratingsTotal as number) - (a.ratingsTotal as number)
    );
}
