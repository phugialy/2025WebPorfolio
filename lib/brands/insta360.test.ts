import { describe, expect, it } from "vitest";
import { INSTA360_ACCESSORIES, INSTA360_ACCESSORY_GROUPS, INSTA360_GROUPS, INSTA360_PICKS, busiestMonth, fallShare, holidayLift, percent, storePathOf, times } from "./insta360";
import { BRAND_TRENDS } from "./insta360-trends";

describe("Insta360 picks", () => {
  it("has one entry per store path, each with a reason to buy, a reason to skip and a source", () => {
    const paths = INSTA360_PICKS.map((p) => p.storePath);
    expect(new Set(paths).size).toBe(paths.length);
    for (const pick of INSTA360_PICKS) {
      expect(pick.goodIf.length).toBeGreaterThan(10);
      expect(pick.skipIf.length).toBeGreaterThan(10);
      expect(pick.sources.length).toBeGreaterThan(0);
      for (const s of pick.sources) expect(s.url).toMatch(/^https:\/\//);
    }
    expect(INSTA360_GROUPS.every((g) => g.picks.length > 0)).toBe(true);
  });

  it("makes no price or discount claims", () => {
    const copy = JSON.stringify([INSTA360_GROUPS, INSTA360_ACCESSORY_GROUPS]);
    expect(copy).not.toMatch(/\$\d|% off|\bsave\b|\bdeal price\b/i);
  });

  it("reads the store path from a tracked store link", () => {
    expect(storePathOf("https://store.insta360.com/product/x5?utm_term=ABC")).toBe("x5");
    expect(storePathOf("https://store.insta360.com/product/luna-series")).toBe("luna-series");
    expect(storePathOf("https://www.amazon.com/dp/B0CG19QXWD")).toBeNull();
    expect(storePathOf(null)).toBeNull();
    // Accessory paths keep their underscores and capitals, as the store uses them.
    expect(storePathOf("https://store.insta360.com/product/Extended_Edition_Selfie_Stick?utm_term=ABC")).toBe("Extended_Edition_Selfie_Stick");
  });

  it("lists each accessory once, for cameras on this page, with ratings only from 10 reviews up", () => {
    const paths = [...INSTA360_PICKS.map((p) => p.storePath), ...INSTA360_ACCESSORIES.map((a) => a.storePath)];
    expect(new Set(paths).size).toBe(paths.length);
    for (const a of INSTA360_ACCESSORIES) {
      expect(a.fits.length).toBeGreaterThan(0);
      if (a.storeRating) expect(a.storeRating.count).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("Insta360 market numbers", () => {
  it("computes the holiday lift from the monthly rows", () => {
    expect(holidayLift(2025, "insta360")).toBeCloseTo(1.43, 2);
    expect(holidayLift(2025, "gopro")).toBeCloseTo(1.0, 1);
    expect(holidayLift(2026, "insta360")).toBeNull(); // year not finished
  });

  it("computes the fall share against GoPro and the busiest month", () => {
    expect(fallShare(2023, "gopro")).toBeCloseTo(0.2, 1);
    expect(fallShare(2026, "gopro")).toBeGreaterThan(0.6);
    expect(busiestMonth(2025, "insta360")).toBe("2025-12");
  });

  it("formats for the page", () => {
    expect(times(1.4321)).toBe("1.43x");
    expect(percent(0.634)).toBe("63%");
    expect(times(null)).toBe("n/a");
  });

  it("has five years of monthly rows in order", () => {
    expect(BRAND_TRENDS.length).toBeGreaterThanOrEqual(59);
    const months = BRAND_TRENDS.map((r) => r[0]);
    expect([...months].sort()).toEqual(months);
  });
});
