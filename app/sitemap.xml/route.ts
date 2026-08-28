import { getSupabaseArticles } from "@/lib/articles";
import { LANES } from "@/lib/lanes";
import { listActiveResources } from "@/lib/affiliate";
import { listPublishedThreads } from "@/lib/threads";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  const posts = await getSupabaseArticles("published");
  const resources = await listActiveResources();
  const threads = await listPublishedThreads();

  const staticPages = [
    { url: "", changefreq: "daily", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.9" },
    { url: "/threads", changefreq: "daily", priority: "0.6" },
    { url: "/about", changefreq: "monthly", priority: "0.7" },
    { url: "/contact", changefreq: "monthly", priority: "0.6" },
    { url: "/opportunity", changefreq: "monthly", priority: "0.7" },
    { url: "/weather", changefreq: "monthly", priority: "0.5" },
    { url: "/guestbook", changefreq: "weekly", priority: "0.5" },
    { url: "/resources", changefreq: "weekly", priority: "0.7" },
    ...LANES.map((lane) => ({
      url: `/topics/${lane.slug}`,
      changefreq: "daily",
      priority: "0.7",
    })),
    ...resources.map((resource) => ({
      url: `/resources/${resource.id}`,
      changefreq: "monthly",
      priority: "0.6",
    })),
    ...threads.map((thread) => ({
      url: `/threads/${thread.id}`,
      changefreq: "monthly",
      priority: "0.4",
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
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
    <lastmod>${new Date(Math.max(post.updatedAt, post.publishDate || post.createdAt)).toISOString()}</lastmod>
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

