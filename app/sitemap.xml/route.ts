import { getSupabaseArticles } from "@/lib/articles";
import { getArticleLane } from "@/components/blog/article-news-card";
import { LANES } from "@/lib/lanes";
import { listActiveResources } from "@/lib/affiliate";
import { listPublishedThreads } from "@/lib/threads";

export const dynamic = "force-dynamic";

// Google has confirmed it ignores priority/changefreq entirely and relies
// on lastmod as the only real freshness signal (and only when it judges
// the value trustworthy) -- so the one thing worth getting right here is
// accurate lastmod on every URL that can have one, not the priority/
// changefreq numbers. Kept priority/changefreq anyway since removing them
// has no downside either way; effort went into lastmod instead.
function postTimestamp(post: { updatedAt: number; publishDate?: number; createdAt: number }) {
  return Math.max(post.updatedAt, post.publishDate || post.createdAt);
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  const posts = await getSupabaseArticles("published");
  const resources = await listActiveResources();
  const threads = await listPublishedThreads();

  const mostRecentPostIso =
    posts.length > 0
      ? new Date(Math.max(...posts.map(postTimestamp))).toISOString()
      : undefined;

  // Real lastmod per lane: the most recent article actually assigned to it
  // by the same getArticleLane() logic the /topics/[lane] page itself uses,
  // not the raw (mostly-empty) portfolio_lane column.
  const laneLastmod = new Map<string, string>();
  for (const lane of LANES) {
    const lanePosts = posts.filter((post) => getArticleLane(post) === lane.value);
    if (lanePosts.length > 0) {
      laneLastmod.set(lane.slug, new Date(Math.max(...lanePosts.map(postTimestamp))).toISOString());
    }
  }

  const staticPages = [
    { url: "", changefreq: "daily", priority: "1.0", lastmod: mostRecentPostIso },
    { url: "/blog", changefreq: "daily", priority: "0.9", lastmod: mostRecentPostIso },
    { url: "/threads", changefreq: "daily", priority: "0.6" },
    { url: "/about", changefreq: "monthly", priority: "0.7" },
    { url: "/contact", changefreq: "monthly", priority: "0.6" },
    { url: "/opportunity", changefreq: "monthly", priority: "0.7" },
    { url: "/disclosure", changefreq: "yearly", priority: "0.3" },
    { url: "/weather", changefreq: "monthly", priority: "0.5" },
    { url: "/guestbook", changefreq: "weekly", priority: "0.5" },
    { url: "/resources", changefreq: "weekly", priority: "0.7" },
    ...LANES.map((lane) => ({
      url: `/topics/${lane.slug}`,
      changefreq: "daily",
      priority: "0.7",
      lastmod: laneLastmod.get(lane.slug),
    })),
    ...resources.map((resource) => ({
      url: `/resources/${resource.id}`,
      changefreq: "monthly",
      priority: "0.6",
      lastmod: new Date(resource.updated_at).toISOString(),
    })),
    ...threads.map((thread) => ({
      url: `/threads/${thread.id}`,
      changefreq: "monthly",
      priority: "0.4",
      lastmod: new Date(thread.updated_at).toISOString(),
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ""}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("")}
  ${posts
    .map(
      (post) => `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(postTimestamp(post)).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
    },
  });
}
