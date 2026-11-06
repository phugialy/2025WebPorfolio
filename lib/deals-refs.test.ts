import { describe, expect, it } from "vitest";
import { HOLIDAYS, dealsRef, describeDealsRef, goHref, isDealsRef } from "./deals-core";

describe("Deals section labels", () => {
  it("accepts every label the pages can produce", () => {
    expect(isDealsRef(dealsRef("trending"))).toBe(true);
    expect(isDealsRef(dealsRef("catalog-search"))).toBe(true);
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
