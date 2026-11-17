import { describe, expect, it } from "vitest";
import { inchSizes, isCurvedGamingMonitor, refreshRates } from "./product-specs";

describe("reading sizes and refresh rates from a title", () => {
  it("finds the usual ways of writing them", () => {
    expect(inchSizes('Alienware 34 Curved Gaming Monitor - 34-Inch QD-OLED')).toEqual([34]);
    expect(inchSizes('LG 34" UltraWide, 32 inch and 27in')).toEqual([34, 32, 27]);
    expect(refreshRates("165Hz, 240 Hz, 144-Hz")).toEqual([165, 240, 144]);
  });

  it("does not mistake other numbers for them", () => {
    expect(inchSizes("WQHD 3440 x 1440 21:9 1ms")).toEqual([]);
    expect(refreshRates("1ms response 3440x1440")).toEqual([]);
  });
});

describe("the curved gaming monitor niche", () => {
  it("accepts a curved 34-inch at 165Hz and a curved 32-inch at 240Hz", () => {
    expect(isCurvedGamingMonitor("Acme 34-Inch Curved Gaming Monitor, 165Hz WQHD Ultrawide")).toBe(true);
    expect(isCurvedGamingMonitor('Acme 32" Curved Gaming Monitor 240Hz 1ms')).toBe(true);
  });

  it("rejects a monitor outside any of the three limits", () => {
    expect(isCurvedGamingMonitor("Acme 34-Inch Gaming Monitor 165Hz")).toBe(false); // not curved
    expect(isCurvedGamingMonitor("Acme 27-Inch Curved Gaming Monitor 165Hz")).toBe(false); // too small
    expect(isCurvedGamingMonitor("Acme 38-Inch Curved Gaming Monitor 165Hz")).toBe(false); // too big
    expect(isCurvedGamingMonitor("Acme 34-Inch Curved Gaming Monitor 100Hz")).toBe(false); // too slow
    expect(isCurvedGamingMonitor("Acme 34-Inch Curved Gaming Monitor 360Hz")).toBe(false); // faster than the niche
  });

  it("rejects a title that leaves the refresh rate or the size out rather than guessing", () => {
    expect(isCurvedGamingMonitor("Acme 34-Inch Curved Gaming Monitor")).toBe(false);
    expect(isCurvedGamingMonitor("Acme Curved Gaming Monitor 165Hz")).toBe(false);
  });
});
