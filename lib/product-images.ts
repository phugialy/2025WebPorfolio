// Helpers for product pictures. Pure, no imports, so they run under Vitest.

// When Amazon challenges the page fetch that fills in a new product, the preview
// image it hands back is its own generic logo, not the product. Treat that, and
// empty values, as "no picture" so a page shows a neutral tile instead of another
// store's logo.
export function hasProductImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return !/\/images\/G\/01\/share-icons\/|previewdoh|\/amazon\.png(\?|$)/i.test(url);
}

// The product's own main picture, read from the same product page that was
// already fetched, for when the page's preview image (og:image) is the logo.
// Looks only at image addresses on Amazon's image host under /images/I/, which is
// where product pictures live; the first one listed is the main picture.
export function mainImageFromAmazonHtml(html: string): string {
  const patterns = [
    /"hiRes"\s*:\s*"(https:[^"]+)"/g,
    /"large"\s*:\s*"(https:[^"]+)"/g,
    /"mainUrl"\s*:\s*"(https:[^"]+)"/g,
    /id="landingImage"[^>]*?src="([^"]+)"/g,
    /data-old-hires="([^"]+)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = match[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
      if (/^https:\/\/m\.media-amazon\.com\/images\/I\//.test(url) && hasProductImage(url)) return url;
    }
  }
  return "";
}

// A picture address is read from a web page, so it is not trusted. Only a public
// https address on the default port is followed: no IP addresses, no localhost,
// no internal names, no embedded credentials. Keeps a hostile page from pointing
// the server at its own network.
export function isPublicHttpsUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".")) return false; // single-label names are internal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false; // IP addresses
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp|intranet)$/.test(host)) return false;
  return true;
}
