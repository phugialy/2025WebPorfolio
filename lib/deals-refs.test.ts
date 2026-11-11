import { describe, expect, it } from "vitest";
import { HOLIDAYS, buildGuideLinks, dealsRef, describeDealsRef, extractGuideProductIds, goHref, isDealsRef } from "./deals-core";

describe("Deals section labels", () => {
  it("accepts every label the pages can produce", () => {
    expect(isDealsRef(dealsRef("trending"))).toBe(true);
    expect(isDealsRef(dealsRef("catalog-search"))).toBe(true);
    expect(isDealsRef(dealsRef("catalog-search-close"))).toBe(true);
    expect(isDealsRef(dealsRef("catalog-search-fallback"))).toBe(true);
    expect(describeDealsRef(dealsRef("catalog-search-fallback"))).toBe("Catalog search: offered when nothing matched");
    expect(isDealsRef(dealsRef("catalog-christmas"))).toBe(true);
    expect(isDealsRef(dealsRef("catalog-desk-setup"))).toBe(true);
    for (const holiday of HOLIDAYS) expect(isDealsRef(dealsRef(holiday.slug))).toBe(true);
  });

  it("matches what the outbound link carries, so clicks and impressions join", () => {
    const href = goHref("00000000-0000-4000-8000-000000000000", "trending");
    expect(decodeURIComponent(href.split("ref=")[1])).toBe(dealsRef("trending"));
  });

  it("rejects anything the pages cannot produce", () => {
    for (const bad of [
      "trending",
      "blog-index-ambit",
      "deals-",
      "deals-unknown-section",
      "deals-catalog-",
      "deals-catalog-UPPER",
      "deals-catalog-a b",
      "deals-catalog--x",
      `deals-catalog-${"x".repeat(60)}`,
      "",
      null,
      undefined,
      42,
    ]) {
      expect(isDealsRef(bad)).toBe(false);
    }
  });

  it("describes labels in plain words", () => {
    expect(describeDealsRef("deals-trending")).toBe("Trending now");
    expect(describeDealsRef("deals-catalog-search")).toBe("Catalog search results");
    expect(describeDealsRef("deals-black-friday")).toBe("Top 10: Black Friday");
    expect(describeDealsRef("deals-catalog-desk-setup")).toBe("Catalog row: desk setup");
  });
});

describe("Product to guide links", () => {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";

  it("finds each product a guide links to, once", () => {
    const text = `Pick [one](/api/affiliate/go/${a}?ref=guide) or [two](/api/affiliate/go/${b.toUpperCase()}) and again [one](/api/affiliate/go/${a})`;
    expect(extractGuideProductIds(text)).toEqual([a, b]);
    expect(extractGuideProductIds(null)).toEqual([]);
    expect(extractGuideProductIds("no links /api/affiliate/go/not-an-id")).toEqual([]);
  });

  it("points a product at the newest guide that features it", () => {
    const links = buildGuideLinks([
      { slug: "old", title: "Old", content: `/api/affiliate/go/${a}`, when: 1 },
      { slug: "new", title: "New", content: `/api/affiliate/go/${a} /api/affiliate/go/${b}`, when: 2 },
    ]);
    expect(links[a]).toEqual({ slug: "new", title: "New" });
    expect(links[b]).toEqual({ slug: "new", title: "New" });
  });
});
