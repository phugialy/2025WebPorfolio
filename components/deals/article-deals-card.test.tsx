import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleDealsCardView } from "./article-deals-card";
import { getHoliday } from "@/lib/deals-core";

const products = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"].map((id, i) => ({
  id,
  name: `Product ${i + 1}`,
  category: i === 0 ? "Monitors" : "Home & Kitchen",
  image_url: "https://m.media-amazon.com/images/I/616-8VSyqdL._AC_SL1500_.jpg",
  buy_if: null,
}));

describe("the end-of-article holiday picks card", () => {
  const html = renderToStaticMarkup(<ArticleDealsCardView holiday={getHoliday("thanksgiving-week")!} products={products} />);

  it("names the holiday and links to its full list", () => {
    expect(html).toContain("Thanksgiving");
    expect(html).toContain('href="/deals/thanksgiving-week"');
    expect(html).toContain("See all Thanksgiving picks");
  });

  it("sends every product through the tracked link under the article-card label", () => {
    for (const p of products) expect(html).toContain(`/api/affiliate/go/${p.id}?ref=deals-catalog-from-article`);
    expect((html.match(/data-deals-ref="deals-catalog-from-article"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("says plainly that it earns from the links, and links the disclosure", () => {
    expect(html).toContain("We earn from qualifying purchases");
    expect(html).toContain('href="/disclosure"');
  });

  it("states no price or percent off", () => {
    expect(html).not.toMatch(/\$\s?\d/);
    expect(html).not.toMatch(/\d+\s?%\s?off/i);
  });
});
