// Fetches a product page and pulls Open Graph metadata for the admin
// "paste a link" flow in AdminAffiliateBoard. Never trusts any URL found
// inside the page for monetization -- Amazon links are always rebuilt from
// the ASIN + our own AMAZON_ASSOCIATE_TAG, so credit can only ever land on
// this site's Associate account, never a third party.

const AMAZON_HOSTS = ["amazon.com", "amzn.to", "a.co"];

export type LinkPreview = {
  name: string;
  description: string;
  imageUrl: string;
  network: "amazon" | "other";
  affiliateUrl: string;
};

function extractMetaProperty(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return "";
}

function extractMetaName(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return "";
}

function extractTitleTag(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : "";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

function isAmazonHost(hostname: string): boolean {
  return AMAZON_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
  const response = await fetch(rawUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PhugialyBot/1.0; +https://www.phugialy.com)",
    },
  });

  const finalUrl = response.url || rawUrl;
  const hostname = new URL(finalUrl).hostname;
  const isAmazon = isAmazonHost(hostname);

  // Preview fields (title/description/image) are best-effort -- Amazon
  // sometimes blocks or challenges automated page fetches. A failure here
  // should never take down the one thing that matters: a correctly tagged
  // link. The admin can fill in the rest by hand if scraping is blocked.
  let name = "";
  let description = "";
  let imageUrl = "";
  try {
    if (response.ok) {
      const html = await response.text();
      name = extractMetaProperty(html, "og:title") || extractTitleTag(html);
      description =
        extractMetaProperty(html, "og:description") || extractMetaName(html, "description");
      imageUrl = extractMetaProperty(html, "og:image");
    }
  } catch {
    // swallow -- preview fields stay empty, link construction below still runs
  }

  if (!isAmazon) {
    return {
      name: name || "Untitled product",
      description,
      imageUrl,
      network: "other",
      // Non-Amazon links are used as-is -- the admin is expected to already
      // have their own tracked affiliate URL for other networks/brands.
      affiliateUrl: finalUrl,
    };
  }

  const asin = extractAsin(finalUrl);
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  const affiliateUrl =
    asin && tag
      ? `https://www.amazon.com/dp/${asin}?tag=${tag}`
      : asin
        ? `https://www.amazon.com/dp/${asin}` // no tag configured yet -- plain, non-monetized, never someone else's
        : finalUrl;

  return {
    name: name || "Untitled product",
    description,
    imageUrl,
    network: "amazon",
    affiliateUrl,
  };
}
