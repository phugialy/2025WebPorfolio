import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  const posts = getAllPosts().slice(0, 20); // Latest 20 posts

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Phu Gia Ly — Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Thoughts on web development, software engineering, and technology.</description>
    <language>en-US</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${escapeXml(post.frontmatter.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.frontmatter.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.frontmatter.summary || "")}</description>
      ${post.frontmatter.author ? `<author>${escapeXml(post.frontmatter.author)}</author>` : ""}
    </item>`
      )
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

