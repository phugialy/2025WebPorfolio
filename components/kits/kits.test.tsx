import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleKitView } from "./article-kit";
import { KitsStripView } from "./kits-strip";
import { KITS } from "@/lib/kits-core";
import type { KitProduct } from "@/lib/kits";

const kit = KITS[0];
const products = Array.from({ length: 10 }, (_, i) => ({
  id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`,
  name: `Product ${i + 1}`,
  category: "Cameras",
  image_url: "https://m.media-amazon.com/images/I/616-8VSyqdL._AC_SL1500_.jpg",
  description: null,
  buy_if: null,
  is_partner: false,
  flag_reason: null,
  affiliate_url: `https://www.amazon.com/dp/B0AAAAAA${String(i).padStart(2, "0")}`,
  role: kit.slots[i].role,
})) as KitProduct[];

describe("the kit block at the end of its article", () => {
  const html = renderToStaticMarkup(<ArticleKitView kit={kit} products={products} />);

  it("shows all ten products, each with its role", () => {
    for (const p of products) expect(html).toContain(`/api/affiliate/go/${p.id}?ref=deals-catalog-kit-${kit.slug}`);
    expect(html).toContain(kit.slots[0].role);
    expect(html).toContain(`/kits/${kit.slug}`);
  });

  it("carries the earnings disclosure and no price or discount claim", () => {
    expect(html).toContain("We earn from qualifying purchases");
    expect(html).toContain('href="/disclosure"');
    expect(html).not.toMatch(/\$\s?\d|\d+\s?%\s?off/i);
  });
});

describe("the kits strip", () => {
  it("lists each ready kit with its product count, and renders nothing for none", () => {
    const html = renderToStaticMarkup(<KitsStripView kits={KITS.slice(0, 2).map((k) => ({ kit: k, productCount: 10 }))} />);
    expect(html).toContain(`/kits/${KITS[0].slug}`);
    expect(html).toContain("10 products");
    expect(renderToStaticMarkup(<KitsStripView kits={[]} />)).toBe("");
  });
});
