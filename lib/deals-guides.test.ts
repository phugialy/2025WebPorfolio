import { describe, expect, it } from "vitest";
import { DEALS_DISCLOSURE_SENTENCE, DEALS_TAG, isDealsGuide, withoutDealsGuides } from "./deals-core";

describe("holiday guide tag", () => {
  it("recognizes the tag regardless of case or spacing", () => {
    expect(DEALS_TAG).toBe("holiday-guide");
    expect(isDealsGuide(["AI", "holiday-guide"])).toBe(true);
    expect(isDealsGuide([" Holiday-Guide "])).toBe(true);
    expect(isDealsGuide(["holiday-guides"])).toBe(false);
    expect(isDealsGuide(["holiday"])).toBe(false);
    expect(isDealsGuide([])).toBe(false);
    expect(isDealsGuide(null)).toBe(false);
    expect(isDealsGuide(undefined)).toBe(false);
  });

  it("removes guides from a list of articles and keeps everything else in order", () => {
    const rows = [
      { slug: "a", tags: ["AI"] },
      { slug: "guide-1", tags: ["holiday-guide", "mini pc"] },
      { slug: "b", tags: null },
      { slug: "guide-2", tags: ["HOLIDAY-GUIDE"] },
      { slug: "c", tags: ["energy"] },
    ];
    expect(withoutDealsGuides(rows).map((r) => r.slug)).toEqual(["a", "b", "c"]);
  });

  it("does not change the input list", () => {
    const rows = [{ slug: "g", tags: ["holiday-guide"] }];
    withoutDealsGuides(rows);
    expect(rows).toHaveLength(1);
  });

  it("the required disclosure sentence is plain, complete and free of price claims", () => {
    expect(DEALS_DISCLOSURE_SENTENCE).toMatch(/qualifying purchases/);
    expect(DEALS_DISCLOSURE_SENTENCE).toMatch(/Amazon Associate/);
    expect(DEALS_DISCLOSURE_SENTENCE).toMatch(/no extra cost/);
    expect(DEALS_DISCLOSURE_SENTENCE).not.toMatch(/\$|% off/);
  });
});
