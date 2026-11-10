import { describe, expect, it } from "vitest";
import { HOLIDAYS } from "./deals-core";

describe("holiday copy matches what the pages show", () => {
  it("never promises books, which are kept off the Deals pages", () => {
    for (const h of HOLIDAYS) {
      expect(`${h.h1} ${h.intro} ${h.seoTitle} ${h.seoDescription}`, h.slug).not.toMatch(/\bbooks?\b/i);
    }
  });

  it("never states a price or a discount", () => {
    for (const h of HOLIDAYS) {
      expect(`${h.intro} ${h.seoDescription}`, h.slug).not.toMatch(/\$|\bpercent\b|% off|\bdiscount|\bcheapest\b|\blowest price/i);
    }
  });

  it("gives every holiday its own heading and its own description", () => {
    expect(new Set(HOLIDAYS.map((h) => h.h1)).size).toBe(HOLIDAYS.length);
    expect(new Set(HOLIDAYS.map((h) => h.seoDescription)).size).toBe(HOLIDAYS.length);
  });
});
