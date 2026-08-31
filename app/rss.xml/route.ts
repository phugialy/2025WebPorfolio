import { getAllPosts } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  // getAllPosts() was already the real, published, publish-date-sorted feed
  // used everywhere else on the site (blog listing, sitemap) -- this route
  // was pointed at a separate, disconnected legacy source (lib/posts.ts)
  // that only ever had one hardcoded placeholder post.
  const posts = (await getAllPosts()).slice(0, 20);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Phu Gia Ly — Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Thoughts on web development, software engineering, and technology.</description>
    <language>en-US</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map((post) => {
        const description =
          post.metadata?.seoDescription ||
          post.metadata?.excerpt ||
          post.metadata?.readerHook ||
          post.metadata?.aiSummary ||
          "";
        return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishDate || post.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
      <author>Phu Gia Ly</author>
    </item>`;
      })
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate",
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
