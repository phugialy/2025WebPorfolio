import { createSupabaseAdminClient } from "@/lib/supabase/server";

const RECENT_DAYS = 3;
// Overlap threshold: two articles sharing this many significant tag words
// are flagged as candidates for cross-linking or differentiation -- the
// closest GSC-independent approximation of "does this cannibalize an
// existing page" without live query data.
const OVERLAP_WORD_THRESHOLD = 3;

const STOPWORDS = new Set([
  "and", "the", "for", "with", "your", "you", "of", "in", "on", "to", "a", "an", "is", "are",
]);

function significantWords(tag: string): Set<string> {
  return new Set(
    tag
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => (word.length > 2 || word === "ai") && !STOPWORDS.has(word))
  );
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");
}

type PageCheck = {
  slug: string;
  url: string;
  ok: boolean;
  issues: string[];
};

async function checkArticlePage(slug: string, sitemapXml: string): Promise<PageCheck> {
  const url = `${siteUrl()}/blog/${slug}`;
  const issues: string[] = [];

  let html = "";
  let status = 0;
  try {
    const response = await fetch(url, { cache: "no-store" });
    status = response.status;
    html = await response.text();
  } catch (error) {
    issues.push(`fetch failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return { slug, url, ok: false, issues };
  }

  if (status !== 200) issues.push(`HTTP ${status}`);
  if (!/<title>[^<]+<\/title>/i.test(html)) issues.push("missing <title>");
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html)) {
    issues.push("missing meta description");
  }
  if (!new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html)) {
    issues.push("missing or mismatched self-referencing canonical");
  }
  if (!/<h1[\s>]/i.test(html)) issues.push("missing <h1>");
  if (!sitemapXml.includes(`/blog/${slug}<`)) issues.push("not found in sitemap.xml");

  return { slug, url, ok: issues.length === 0, issues };
}

type OverlapPair = {
  a: string;
  b: string;
  sharedWords: string[];
};

function findTopicOverlaps(
  articles: Array<{ slug: string; tags: string[] | null }>
): OverlapPair[] {
  const wordSets = articles.map((a) => ({
    slug: a.slug,
    words: new Set((a.tags || []).flatMap((t) => [...significantWords(t)])),
  }));

  const overlaps: OverlapPair[] = [];
  for (let i = 0; i < wordSets.length; i++) {
    for (let j = i + 1; j < wordSets.length; j++) {
      const shared = [...wordSets[i].words].filter((w) => wordSets[j].words.has(w));
      if (shared.length >= OVERLAP_WORD_THRESHOLD) {
        overlaps.push({ a: wordSets[i].slug, b: wordSets[j].slug, sharedWords: shared });
      }
    }
  }
  return overlaps.sort((x, y) => y.sharedWords.length - x.sharedWords.length);
}

export async function runSiteHealthCheck() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: allArticles, error: allError } = await supabase
    .from("articles")
    .select("slug, tags")
    .eq("status", "published");

  if (allError) {
    throw allError;
  }

  const cutoff = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentArticles, error: recentError } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "published")
    .or(`published_at.gte.${cutoff},created_at.gte.${cutoff}`);

  if (recentError) {
    throw recentError;
  }

  let sitemapXml = "";
  try {
    const sitemapRes = await fetch(`${siteUrl()}/sitemap.xml`, { cache: "no-store" });
    sitemapXml = await sitemapRes.text();
  } catch (error) {
    console.error("Site health: failed to fetch sitemap.xml:", error);
  }

  const pageChecks = await Promise.all(
    (recentArticles || []).map((a) => checkArticlePage(a.slug, sitemapXml))
  );

  const overlaps = findTopicOverlaps(allArticles || []);

  const failedPages = pageChecks.filter((p) => !p.ok);
  if (failedPages.length > 0) {
    console.warn("Site health: pages with issues:", JSON.stringify(failedPages));
  }
  if (overlaps.length > 0) {
    console.warn(
      "Site health: potential topic overlaps:",
      JSON.stringify(overlaps.slice(0, 20))
    );
  }

  return {
    checkedPages: pageChecks.length,
    failedPages,
    overlapPairsFound: overlaps.length,
    topOverlaps: overlaps.slice(0, 20),
  };
}
