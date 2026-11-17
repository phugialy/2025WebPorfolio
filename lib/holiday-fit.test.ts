import { describe, expect, it } from "vitest";
import {
  DEMAND_NUDGE_MAX,
  DEMAND_NUDGE_MIN,
  FOCUS_BOOST,
  LIFT_MAX,
  LIFT_MIN,
  SEASON_STUDY,
  demandNudges,
  fitBand,
  holidayFit,
  seasonLift,
  termFor,
} from "./holiday-fit";
import { HOLIDAYS, getHoliday, holidayTop, scoreProducts, type DealsProduct } from "./deals-core";
import { allTrendTerms } from "./discovery-plan";

describe("which measured product type a catalog product stands for", () => {
  it("uses the name inside a shared category, so earbuds and headphones are told apart", () => {
    expect(termFor({ category: "Audio", name: "Sony WF-1000XM5 Wireless Earbuds" })).toBe("wireless earbuds");
    expect(termFor({ category: "Audio", name: "Bose QuietComfort Ultra Headphones" })).toBe("headphones");
    expect(termFor({ category: "Audio", name: "Anker Soundcore Speaker" })).toBe("headphones");
  });

  it("tells an espresso machine from a robot vacuum inside Home & Kitchen", () => {
    expect(termFor({ category: "Home & Kitchen", name: "De'Longhi Magnifica Duo Espresso Machine" })).toBe("espresso machine");
    expect(termFor({ category: "Home & Kitchen", name: "eufy C28 Robot Vacuum and Mop" })).toBe("robot vacuum");
    expect(termFor({ category: "Home & Kitchen", name: "Some Unlisted Gadget" })).toBeNull();
  });

  it("gives a curved or ultrawide gaming monitor its own niche term, and a plain monitor the general one", () => {
    expect(termFor({ category: "Monitors", name: "Alienware 34 Curved Gaming Monitor AW3425DWM" })).toBe("curved gaming monitor");
    expect(termFor({ category: "Monitors", name: "LG 34WN80C-B UltraWide Monitor 34 inch" })).toBe("curved gaming monitor");
    expect(termFor({ category: "Monitors", name: "ASUS 27 inch 4K Monitor" })).toBe("4k monitor");
  });

  it("returns nothing for a category it does not measure", () => {
    expect(termFor({ category: "Books", name: "x" })).toBeNull();
    expect(termFor({ category: null, name: "x" })).toBeNull();
  });
});

describe("the seasonal lift of a product type in a holiday's window", () => {
  it("is bigger in Black Friday's window than in Christmas's for most types (people research before they gift)", () => {
    let bigger = 0;
    for (const term of Object.keys(SEASON_STUDY)) if (seasonLift(term, "black-friday") > seasonLift(term, "christmas-gifts")) bigger += 1;
    expect(bigger).toBeGreaterThanOrEqual(Object.keys(SEASON_STUDY).length - 1);
  });

  it("keeps keyboards for the online sales days: flat at Thanksgiving, up at Black Friday and Cyber Monday", () => {
    expect(seasonLift("mechanical keyboard", "thanksgiving-week")).toBeLessThan(1.1);
    expect(seasonLift("mechanical keyboard", "cyber-monday")).toBeGreaterThan(1.4);
  });

  it("trusts a tiny term only halfway and never goes outside the caps", () => {
    // earbuds measured 4.69x at Black Friday but at 0.02 of laptop interest: pulled halfway to 1
    expect(seasonLift("wireless earbuds", "black-friday")).toBeCloseTo(1 + 3.69 * 0.5, 1);
    for (const term of Object.keys(SEASON_STUDY)) {
      for (const h of HOLIDAYS) {
        const v = seasonLift(term, h.slug);
        expect(v).toBeGreaterThanOrEqual(LIFT_MIN);
        expect(v).toBeLessThanOrEqual(LIFT_MAX);
      }
    }
  });

  it("is neutral for an unmeasured term or an unknown holiday", () => {
    expect(seasonLift(null, "black-friday")).toBe(1);
    expect(seasonLift("ergonomic office chair", "black-friday")).toBe(1);
    expect(seasonLift("laptop", "not-a-holiday")).toBe(1);
  });

  it("covers every product type the discovery engine can propose, or knowingly leaves it out", () => {
    const leftOut = new Set(["podcast microphone", "ergonomic office chair"]); // Google rounds these to zero next to laptops
    for (const term of allTrendTerms()) {
      if (leftOut.has(term)) continue;
      expect(SEASON_STUDY[term] ?? null, `${term} needs a row in SEASON_STUDY or a reason to leave it out`).not.toBeNull();
    }
  });
});

describe("this year's demand as a nudge", () => {
  it("lifts a type above the median and lowers one below it, within 0.7x-1.5x", () => {
    const nudges = demandNudges({ headphones: 0.43, "air fryer": 0.58, "espresso machine": 0.09, "robot vacuum": 0.04, "carry on luggage": 0.04 });
    expect(nudges["air fryer"]).toBeGreaterThan(1);
    expect(nudges["carry on luggage"]).toBeLessThan(1);
    for (const v of Object.values(nudges)) {
      expect(v).toBeGreaterThanOrEqual(DEMAND_NUDGE_MIN);
      expect(v).toBeLessThanOrEqual(DEMAND_NUDGE_MAX);
    }
  });

  it("gives the laptop anchor no nudge, and nothing when too few terms were measured", () => {
    expect(demandNudges({ laptop: 1, "air fryer": 0.5, headphones: 0.4, "robot vacuum": 0.04 }).laptop).toBeUndefined();
    expect(demandNudges({ "air fryer": 0.5, headphones: 0.4 })).toEqual({});
    expect(demandNudges(null)).toEqual({});
  });
});

describe("a product's fit for a holiday", () => {
  const bf = getHoliday("black-friday")!;
  const xmas = getHoliday("christmas-gifts")!;

  it("multiplies the lift, the demand nudge and the focus boost, and says what each was", () => {
    const parts = holidayFit(bf, { category: "Home & Kitchen", name: "eufy Robot Vacuum" }, { "robot vacuum": 1.2 });
    expect(parts.term).toBe("robot vacuum");
    expect(parts.demand).toBe(1.2);
    expect(parts.focus).toBe(FOCUS_BOOST); // Home & Kitchen is in Black Friday's focus
    expect(parts.fit).toBeCloseTo(parts.lift * 1.2 * FOCUS_BOOST, 2);
  });

  it("falls back to the focus alone for a category it does not measure", () => {
    expect(holidayFit(bf, { category: "Everyday Carry", name: "x" }).fit).toBe(1); // not in Black Friday's focus
    expect(holidayFit(xmas, { category: "Everyday Carry", name: "x" }).fit).toBe(FOCUS_BOOST);
  });

  it("puts a robot vacuum above a standing desk on Black Friday, from the measured lifts", () => {
    const vac = holidayFit(bf, { category: "Home & Kitchen", name: "Robot Vacuum" }).fit;
    const desk = holidayFit(bf, { category: "Desk Setup", name: "Standing Desk" }).fit;
    expect(vac).toBeGreaterThan(desk);
  });

  it("rounds to quarter steps so close products keep rotating", () => {
    expect(fitBand(1.1)).toBe(1);
    expect(fitBand(1.13)).toBe(1.25);
    expect(fitBand(1.12)).toBe(1);
  });
});

describe("the holiday list ordered by fit", () => {
  const p = (id: string, category: string, name: string): DealsProduct => ({ id, name, category }) as DealsProduct;
  const catalog = [
    p("desk1", "Desk Setup", "Standing Desk"),
    p("desk2", "Desk Setup", "Standing Desk Frame"),
    p("vac1", "Home & Kitchen", "Robot Vacuum Pro"),
    p("esp1", "Home & Kitchen", "Espresso Machine"),
    p("kb1", "Keyboards", "Mechanical Keyboard"),
    p("bud1", "Audio", "Wireless Earbuds"),
  ];
  const scored = scoreProducts(catalog, [], Date.UTC(2026, 10, 11));
  const bf = getHoliday("black-friday")!;

  it("leads with the types that lifted most last Black Friday", () => {
    const fit = (h: typeof bf, product: (typeof scored)[number]) => holidayFit(h, product).fit;
    const ids = holidayTop(bf, scored, 6, [], fit).map((x) => x.id);
    expect(ids.indexOf("vac1")).toBeLessThan(ids.indexOf("desk1"));
    expect(ids.indexOf("esp1")).toBeLessThan(ids.indexOf("desk2"));
  });

  it("still puts a different product first on a different holiday, from the same catalog", () => {
    const fit = (h: typeof bf, product: (typeof scored)[number]) => holidayFit(h, product).fit;
    const cm = getHoliday("cyber-monday")!;
    const ny = getHoliday("new-year-setup")!;
    expect(holidayTop(cm, scored, 6, [], fit).map((x) => x.id)).not.toEqual(holidayTop(ny, scored, 6, [], fit).map((x) => x.id));
  });

  it("without a fit function the order is exactly the old focus order", () => {
    expect(holidayTop(bf, scored, 6, []).map((x) => x.id)).toEqual(holidayTop(bf, scored, 6, [], undefined).map((x) => x.id));
  });
});
