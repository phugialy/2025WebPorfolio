import { afterEach, describe, expect, it, vi } from "vitest";
import { hasProductImage, isPublicHttpsUrl, mainImageFromAmazonHtml } from "./product-images";
import { fetchLinkPreview } from "./link-preview";

const PLACEHOLDER = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";
const MAIN = "https://m.media-amazon.com/images/I/71UKiaeIN0L._AC_SL1500_.jpg";

describe("hasProductImage", () => {
  it("rejects Amazon's logo placeholder and empty values, accepts a product picture", () => {
    expect(hasProductImage(PLACEHOLDER)).toBe(false);
    expect(hasProductImage("https://m.media-amazon.com/images/G/01/something/amazon.png")).toBe(false);
    expect(hasProductImage("")).toBe(false);
    expect(hasProductImage(null)).toBe(false);
    expect(hasProductImage(undefined)).toBe(false);
    expect(hasProductImage(MAIN)).toBe(true);
  });
});

describe("mainImageFromAmazonHtml", () => {
  it("reads the first main picture from the product page", () => {
    const html = `<script>{"hiRes":"${MAIN}","large":"https://m.media-amazon.com/images/I/other.jpg"}</script>`;
    expect(mainImageFromAmazonHtml(html)).toBe(MAIN);
  });

  it("falls back to the landing image tag and decodes escaped ampersands", () => {
    const html = `<img id="landingImage" class="x" src="https://m.media-amazon.com/images/I/abc.jpg?a=1&amp;b=2">`;
    expect(mainImageFromAmazonHtml(html)).toBe("https://m.media-amazon.com/images/I/abc.jpg?a=1&b=2");
  });

  it("ignores the logo, other hosts and pages with no picture", () => {
    expect(mainImageFromAmazonHtml(`{"hiRes":"${PLACEHOLDER}"}`)).toBe("");
    expect(mainImageFromAmazonHtml(`{"hiRes":"https://evil.example/images/I/x.jpg"}`)).toBe("");
    expect(mainImageFromAmazonHtml("<html></html>")).toBe("");
  });
});

describe("link preview never stores the Amazon logo as a product image", () => {
  afterEach(() => vi.unstubAllGlobals());

  const page = (ogImage: string, extra = "") =>
    `<html><head><meta property="og:title" content="Power Bank"><meta property="og:image" content="${ogImage}"></head><body>${extra}</body></html>`;
  const stub = (html: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, url: "https://www.amazon.com/dp/B0DFLNL3XM", text: async () => html })));

  it("uses the page's real main picture when the preview image is the logo", async () => {
    stub(page(PLACEHOLDER, `<script>{"hiRes":"${MAIN}"}</script>`));
    expect((await fetchLinkPreview("https://www.amazon.com/dp/B0DFLNL3XM")).imageUrl).toBe(MAIN);
  });

  it("leaves the image empty, not the logo, when no real picture can be found", async () => {
    stub(page(PLACEHOLDER));
    expect((await fetchLinkPreview("https://www.amazon.com/dp/B0DFLNL3XM")).imageUrl).toBe("");
  });

  it("keeps a good preview image as it is", async () => {
    stub(page(MAIN));
    expect((await fetchLinkPreview("https://www.amazon.com/dp/B0DFLNL3XM")).imageUrl).toBe(MAIN);
  });
});

describe("isPublicHttpsUrl", () => {
  it("accepts a public https address", () => {
    expect(isPublicHttpsUrl(MAIN)).toBe(true);
    expect(isPublicHttpsUrl("https://images.example.com/a.jpg?x=1")).toBe(true);
    expect(isPublicHttpsUrl("https://shop.example.com:443/a.jpg")).toBe(true);
  });

  it("refuses anything that could reach the server's own network or is not https", () => {
    for (const bad of [
      "http://m.media-amazon.com/images/I/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.5/a.jpg",
      "https://[::1]/a.jpg",
      "https://localhost/a.jpg",
      "https://intranet/a.jpg",
      "https://db.internal/a.jpg",
      "https://printer.local/a.jpg",
      "https://user:pass@example.com/a.jpg",
      "https://example.com:8443/a.jpg",
      "ftp://example.com/a.jpg",
      "/images/a.jpg",
      "not a url",
      "",
    ]) {
      expect(isPublicHttpsUrl(bad), bad).toBe(false);
    }
    expect(isPublicHttpsUrl(null)).toBe(false);
  });
});
