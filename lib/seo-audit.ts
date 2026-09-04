import { querySearchAnalytics, type GscRow } from "@/lib/gsc";

export type SeoAuditReport = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number | null;
    avgPosition: number | null;
  };
  topQueries: GscRow[];
  topPages: GscRow[];
  nearMissOpportunities: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
};

// Only sc-domain:phugialy.com actually returns data -- the two URL-prefix
// properties (https://phugialy.com/, https://www.phugialy.com/) 403 because
// the service account only has Search Console permission on the domain
// property. That's a Search Console settings change only the site owner can
// make (add the service account as a user on those properties too); nothing
// to fix in code.
const WORKING_PROPERTY = "sc-domain:phugialy.com";

/**
 * "Near-miss opportunity" = a query/page pair with real search volume
 * (impressions) sitting just off page 1 (position 8-20) -- the highest-
 * leverage thing to optimize, since it's already being shown for real
 * searches and a small push (title/meta/content tweak) could move it onto
 * page 1 where CTR jumps sharply. Filtered by dimension pair, not query
 * alone, since the fix (if any) is usually page-specific.
 */
export async function getSeoAudit(days = 90): Promise<SeoAuditReport> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [totalsRow, byQuery, byPage, byQueryPage] = await Promise.all([
    // Dimensionless query -- the only way to get the true total. Any
    // per-dimension breakdown (query, page, or both) is subject to Google's
    // "anonymized queries" privacy filtering: a query too rare to meet its
    // threshold (common at low volume) is dropped from that breakdown
    // entirely, even though its clicks/impressions still happened. Summing
    // the query or page tables under-counts; this doesn't.
    querySearchAnalytics({ siteUrl: WORKING_PROPERTY, startDate, endDate, dimensions: [], rowLimit: 1 }),
    querySearchAnalytics({ siteUrl: WORKING_PROPERTY, startDate, endDate, dimensions: ["query"], rowLimit: 100 }),
    querySearchAnalytics({ siteUrl: WORKING_PROPERTY, startDate, endDate, dimensions: ["page"], rowLimit: 100 }),
    querySearchAnalytics({
      siteUrl: WORKING_PROPERTY,
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: 250,
    }),
  ]);

  const totals = totalsRow[0];

  const nearMissOpportunities = byQueryPage
    .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

  return {
    siteUrl: WORKING_PROPERTY,
    startDate,
    endDate,
    totals: {
      clicks: totals?.clicks ?? 0,
      impressions: totals?.impressions ?? 0,
      ctr: totals?.ctr ?? null,
      avgPosition: totals?.position ?? null,
    },
    topQueries: byQuery.slice(0, 25),
    topPages: byPage.slice(0, 25),
    nearMissOpportunities,
  };
}
