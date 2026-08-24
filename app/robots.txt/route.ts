export function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/affiliate/go/

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com"}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

