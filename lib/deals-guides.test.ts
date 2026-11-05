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

import { affiliateAnchorProps } from "./mdx-utils";
import { DEALS_HIDES } from "./deals-core";

describe("affiliate links in article bodies", () => {
  it("marks tracked affiliate links as sponsored, no-follow and new-tab", () => {
    const props = affiliateAnchorProps("/api/affiliate/go/abc-123?ref=some-guide");
    expect(props).not.toBeNull();
    expect(props!.rel).toContain("sponsored");
    expect(props!.rel).toContain("nofollow");
    expect(props!.target).toBe("_blank");
  });
  it("leaves every other link alone", () => {
    expect(affiliateAnchorProps("/deals/black-friday")).toBeNull();
    expect(affiliateAnchorProps("https://example.com")).toBeNull();
    expect(affiliateAnchorProps("")).toBeNull();
    expect(affiliateAnchorProps(undefined)).toBeNull();
  });
});

describe("products held back from the Deals pages", () => {
  it("includes the items the research pass could not stand behind", () => {
    for (const prefix of ["53d33449", "3f554da3", "24e555dc", "7b264c53", "705597c0"]) {
      expect(DEALS_HIDES.some((id) => id.startsWith(prefix))).toBe(true);
    }
  });
});
