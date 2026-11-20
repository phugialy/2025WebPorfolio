import { describe, expect, it } from "vitest";
import { KITS, KIT_MIN_PRODUCTS, KIT_SIZE, asinOf, getKit, kitForArticle, kitIsReady, kitRefSlug, orderKitProducts, type Kit } from "./kits-core";
import { describeDealsRef, isDealsRef, dealsRef } from "./deals-core";

describe("the kit definitions", () => {
  it("every kit has ten role slots, a unique slug and a short, claim-free page", () => {
    expect(new Set(KITS.map((k) => k.slug)).size).toBe(KITS.length);
    for (const kit of KITS) {
      expect(kit.slots, kit.slug).toHaveLength(KIT_SIZE);
      expect(new Set(kit.slots.map((s) => s.role)).size, `${kit.slug} roles are distinct`).toBe(KIT_SIZE);
      expect(`${kit.h1} ${kit.intro} ${kit.seoDescription}`, kit.slug).not.toMatch(/\$\s?\d|\d+\s?%\s?off|lowest price|best price/i);
      expect(kit.seoTitle.length, kit.slug).toBeLessThanOrEqual(70);
      expect(kit.seoDescription.length, kit.slug).toBeLessThanOrEqual(200);
    }
  });

  it("each kit's tracking label is one the endpoint accepts and the results panel names", () => {
    for (const kit of KITS) {
      const label = dealsRef(kitRefSlug(kit));
      expect(isDealsRef(label), kit.slug).toBe(true);
      expect(describeDealsRef(label)).toMatch(/^Kit: /);
    }
  });

  it("a kit's ASINs, when set, are real-looking and used once across the kit", () => {
    for (const kit of KITS) {
      const set = kit.slots.map((s) => s.asin).filter((a): a is string => a !== null);
      for (const asin of set) expect(asin, kit.slug).toMatch(/^[A-Z0-9]{10}$/);
      expect(new Set(set).size, kit.slug).toBe(set.length);
    }
  });

  it("finds a kit by slug and by the article it is tied to", () => {
    expect(getKit("travel-kit")?.name).toBe("Travel kit");
    expect(getKit("nope")).toBeUndefined();
    const tied: Kit = { ...KITS[0], articleSlug: "an-article" };
    expect(kitForArticle("an-article")).toBeUndefined(); // none of the shipped kits is tied to it
    expect([tied].find((k) => k.articleSlug === "an-article")?.slug).toBe(KITS[0].slug);
  });
});

describe("matching catalog products to a kit", () => {
  const kit: Kit = {
    ...KITS[0],
    slots: [
      { role: "The camera", asin: "B0AAAAAAA1" },
      { role: "Memory card", asin: "B0AAAAAAA2" },
      { role: "No listing yet", asin: null },
      { role: "Case", asin: "B0AAAAAAA3" },
    ],
  };
  const row = (id: string, url: string) => ({ id, affiliate_url: url });

  it("reads the listing ID from the usual Amazon link shapes", () => {
    expect(asinOf("https://www.amazon.com/dp/B0AAAAAAA1?tag=x-20")).toBe("B0AAAAAAA1");
    expect(asinOf("https://www.amazon.com/Some-Name/dp/b0aaaaaaa1/ref=sr_1_1")).toBe("B0AAAAAAA1");
    expect(asinOf("https://www.amazon.com/gp/product/B0AAAAAAA1")).toBe("B0AAAAAAA1");
    expect(asinOf("https://example.com/page")).toBeNull();
    expect(asinOf(null)).toBeNull();
  });

  it("puts products in slot order with their role, skipping empty slots and missing products", () => {
    const rows = [
      row("case", "https://www.amazon.com/dp/B0AAAAAAA3?tag=t"),
      row("cam", "https://www.amazon.com/dp/B0AAAAAAA1?tag=t"),
      row("other", "https://www.amazon.com/dp/B0ZZZZZZZZ?tag=t"),
    ];
    const ordered = orderKitProducts(kit, rows);
    expect(ordered.map((p) => `${p.role}:${p.id}`)).toEqual(["The camera:cam", "Case:case"]);
  });

  it("never lists one product twice", () => {
    const twice: Kit = { ...kit, slots: [{ role: "A", asin: "B0AAAAAAA1" }, { role: "B", asin: "B0AAAAAAA1" }] };
    expect(orderKitProducts(twice, [row("cam", "https://www.amazon.com/dp/B0AAAAAAA1")])).toHaveLength(1);
  });

  it("a kit is listed only once it has enough active products", () => {
    expect(kitIsReady(KIT_MIN_PRODUCTS - 1)).toBe(false);
    expect(kitIsReady(KIT_MIN_PRODUCTS)).toBe(true);
  });
});
