import { describe, expect, it } from "vitest";
import {
  DISCOVERY_PRICE_FLOOR,
  DISCOVERY_TARGETS,
  HOLIDAY_TARGETS_PER_RUN,
  MARKET_SCAN_FLAG,
  PLAN_WINDOWS,
  allTrendTerms,
  buildFitPrompt,
  demandFactors,
  orderTargets,
  trendTermOf,
  type PlanSnapshot,
  meetsPriceFloor,
  pickTargets,
  planWindowFor,
  priceValue,
  shouldClearProposalFlag,
} from "./discovery-plan";
import { HOLIDAYS, SECTIONS, defaultTagsFor, sectionSlugFor } from "./deals-core";
import { dayInEpoch } from "./rotation-core";

const std = ["AI Engineering", "AI Hardware", "Keyboards", "Monitors", "Input Devices", "Docking & Hubs"];
const at = (iso: string) => Date.parse(`${iso}T14:45:00Z`);

describe("the holiday plan", () => {
  it("every window names only targets that exist", () => {
    for (const w of PLAN_WINDOWS) for (const key of w.targets) expect(DISCOVERY_TARGETS[key], key).toBeDefined();
  });

  it("windows are contiguous and cover Nov 9 to Jan 2", () => {
    expect(PLAN_WINDOWS[0].from).toBe("2026-11-09");
    for (let i = 1; i < PLAN_WINDOWS.length; i += 1) expect(PLAN_WINDOWS[i].from).toBe(PLAN_WINDOWS[i - 1].to);
    expect(PLAN_WINDOWS.at(-1)!.to).toBe("2027-01-03");
  });

  it("every target files into a Deals section and reaches at least one holiday list", () => {
    for (const t of Object.values(DISCOVERY_TARGETS)) {
      expect(sectionSlugFor(t.category), `${t.key} -> ${t.category}`).not.toBe("more");
      expect(defaultTagsFor(t.category).some((tag) => HOLIDAYS.some((h) => h.slug === tag)), t.key).toBe(true);
    }
  });

  it("the plan is not only technology: general holiday products are targeted too", () => {
    const general = Object.values(DISCOVERY_TARGETS).filter((t) => !defaultTagsFor(t.category).includes("technology"));
    expect(general.length).toBeGreaterThanOrEqual(4);
    const windowKeys = new Set(PLAN_WINDOWS.flatMap((w) => w.targets));
    for (const t of general) expect(windowKeys.has(t.key), t.key).toBe(true);
  });

  it("the new section is on the holiday lists", () => {
    expect(SECTIONS.some((s) => s.slug === "laptops-wearables")).toBe(true);
    expect(defaultTagsFor("Laptops")).toEqual(expect.arrayContaining(["black-friday", "cyber-monday", "thanksgiving-week"]));
  });

  it("holiday picks apply the $80 floor and spend two searches from the window", () => {
    expect(DISCOVERY_PRICE_FLOOR).toBe(80);
    const pick = pickTargets(at("2026-11-09"), std);
    expect(pick.mode).toBe("holiday-plan");
    expect(pick.priceFloor).toBe(DISCOVERY_PRICE_FLOOR);
    expect(pick.targets).toHaveLength(HOLIDAY_TARGETS_PER_RUN);
    const window = planWindowFor(at("2026-11-09"))!;
    for (const t of pick.targets) expect(window.targets).toContain(t.key);
    expect(new Set(pick.targets.map((t) => t.key)).size).toBe(2);
  });

  it("the two days of a 48-hour period pick different targets, and each day is stable", () => {
    // 05:00 UTC starts a rotation day; two of them make one strategy period.
    const keys = (iso: string) => pickTargets(Date.parse(iso), std).targets.map((t) => t.key);
    const found = Array.from({ length: 30 }, (_, i) => Date.parse("2026-11-09T06:00:00Z") + i * 86_400_000)
      .filter((t) => planWindowFor(t) && dayInEpoch(t) === 0);
    for (const t of found.slice(0, 8)) {
      const day0 = pickTargets(t, std).targets.map((x) => x.key);
      const day1 = pickTargets(t + 86_400_000, std).targets.map((x) => x.key);
      if (planWindowFor(t + 86_400_000) !== planWindowFor(t)) continue; // a window boundary re-plans
      expect(day0.filter((k) => day1.includes(k))).toEqual([]);
      expect(pickTargets(t, std).targets.map((x) => x.key)).toEqual(day0);
    }
    expect(keys("2026-11-10T06:00:00Z")).toEqual(keys("2026-11-10T20:00:00Z"));
  });

  it("the next period draws a different order", () => {
    const window = PLAN_WINDOWS[0];
    const orders = new Set(Array.from({ length: 12 }, (_, e) => orderTargets(window, null, e).map((t) => t.key).join()));
    expect(orders.size).toBeGreaterThan(6);
  });

  it("real-world demand moves a product type the same way, but only a little", () => {
    const window = PLAN_WINDOWS[0];
    const firstShare = (demand: Record<string, number> | null) => {
      let first = 0;
      for (let e = 0; e < 600; e += 1) if (orderTargets(window, null, e, demand)[0].key === "monitors") first += 1;
      return first;
    };
    const neutral = firstShare(null);
    expect(firstShare({ monitors: 1.5 })).toBeGreaterThan(neutral);
    expect(firstShare({ monitors: 0.7 })).toBeLessThan(neutral);
    expect(firstShare({})).toBe(neutral); // no opinion changes nothing
  });

  it("live performance moves a category: a hot one is drawn first more often, a cold one less", () => {
    const window = PLAN_WINDOWS[0];
    const firstShare = (category: string, factor: number) => {
      const snapshot: PlanSnapshot = { epoch: 0, computedAt: "", factors: { [category]: factor } };
      let first = 0;
      for (let e = 0; e < 600; e += 1) if (orderTargets(window, snapshot, e)[0].category === category) first += 1;
      return first;
    };
    const neutral = firstShare("Monitors", 1);
    expect(firstShare("Monitors", 1.5)).toBeGreaterThan(neutral);
    expect(firstShare("Monitors", 0.7)).toBeLessThan(neutral);
  });

  it("the plan keeps its say: with no live data the plan's top priority is drawn first most often", () => {
    const window = PLAN_WINDOWS[0];
    const counts = new Map<string, number>();
    for (let e = 0; e < 600; e += 1) {
      const key = orderTargets(window, null, e)[0].key;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(best).toBe(window.targets[0]);
  });

  it("no target is starved: every target is visited at least once over the season", () => {
    const visited = new Set<string>();
    const start = Date.parse("2026-11-09T06:00:00Z");
    for (let d = 0; d < 55; d += 1) for (const t of pickTargets(start + d * 86_400_000, std).targets) visited.add(t.key);
    expect([...visited].sort()).toEqual(Object.keys(DISCOVERY_TARGETS).sort());
  });

  it("outside the season it is the original one-category rotation, with no price floor", () => {
    for (const d of ["2026-11-08", "2027-01-03", "2026-06-01"]) {
      const pick = pickTargets(at(d), std);
      expect(planWindowFor(at(d))).toBeNull();
      expect(pick.mode).toBe("standing-rotation");
      expect(pick.priceFloor).toBe(0);
      expect(pick.targets).toHaveLength(1);
      expect(std).toContain(pick.targets[0].category);
    }
  });

  it("the season's boundaries fall on UTC midnight", () => {
    expect(planWindowFor(Date.parse("2026-11-09T00:00:00Z"))).not.toBeNull();
    expect(planWindowFor(Date.parse("2026-11-08T23:59:59Z"))).toBeNull();
    expect(planWindowFor(Date.parse("2027-01-02T23:59:59Z"))).not.toBeNull();
    expect(planWindowFor(Date.parse("2027-01-03T00:00:00Z"))).toBeNull();
  });
});

describe("price", () => {
  it("reads Canopy's price shape", () => {
    expect(priceValue({ value: 1139, currency: "USD", display: "$1,139.00" })).toBe(1139);
  });
  it("ignores missing, zero, non-numeric and non-USD prices", () => {
    expect(priceValue(null)).toBeNull();
    expect(priceValue(undefined)).toBeNull();
    expect(priceValue({ value: 0 })).toBeNull();
    expect(priceValue({ value: Number.NaN })).toBeNull();
    expect(priceValue({ value: 200, currency: "EUR" })).toBeNull();
  });
  it("the floor passes at exactly $80, fails below, and fails when the price is unknown", () => {
    expect(meetsPriceFloor({ value: 80, currency: "USD" }, DISCOVERY_PRICE_FLOOR)).toBe(true);
    expect(meetsPriceFloor({ value: 79.99, currency: "USD" }, DISCOVERY_PRICE_FLOOR)).toBe(false);
    expect(meetsPriceFloor({ value: 90, currency: "USD" }, DISCOVERY_PRICE_FLOOR)).toBe(true);
    expect(meetsPriceFloor(null, DISCOVERY_PRICE_FLOOR)).toBe(false);
    expect(meetsPriceFloor({ value: 100, currency: "USD" }, 100)).toBe(true);
    expect(meetsPriceFloor({ value: 99.99, currency: "USD" }, 100)).toBe(false);
    expect(meetsPriceFloor(null, 100)).toBe(false);
  });
  it("a floor of 0 means no floor, even with no price", () => {
    expect(meetsPriceFloor(null, 0)).toBe(true);
    expect(meetsPriceFloor({ value: 5 }, 0)).toBe(true);
  });
});

describe("clearing the engine's flag on activation", () => {
  const base = { previousStatus: "inactive", nextStatus: "active", previousFlagReason: MARKET_SCAN_FLAG, flagReasonInUpdate: false };
  it("clears it when an admin activates an engine proposal", () => {
    expect(shouldClearProposalFlag(base)).toBe(true);
  });
  it("leaves other flags alone (underperforming, compliance holds)", () => {
    expect(shouldClearProposalFlag({ ...base, previousFlagReason: "No clicks after 30 days" })).toBe(false);
    expect(shouldClearProposalFlag({ ...base, previousFlagReason: "Pending Ambit compliance approval" })).toBe(false);
    expect(shouldClearProposalFlag({ ...base, previousFlagReason: null })).toBe(false);
  });
  it("only on the inactive to active step", () => {
    expect(shouldClearProposalFlag({ ...base, previousStatus: "active" })).toBe(false);
    expect(shouldClearProposalFlag({ ...base, nextStatus: "inactive" })).toBe(false);
    expect(shouldClearProposalFlag({ ...base, nextStatus: undefined })).toBe(false);
  });
  it("defers to an explicit flag change in the same update", () => {
    expect(shouldClearProposalFlag({ ...base, flagReasonInUpdate: true })).toBe(false);
  });
});

describe("the fit prompt", () => {
  const target = DISCOVERY_TARGETS.laptops;
  const input = { target, title: "Apple 2026 MacBook Air 13-inch", rating: 4.7, ratingsTotal: 1369, price: 1139, existingNames: ["Dell XPS 13"] };

  it("holiday mode gives the model the real price and the existing catalog, and no impulse-buy rule", () => {
    const p = buildFitPrompt({ ...input, mode: "holiday-plan" });
    expect(p.user).toContain("$1139");
    expect(p.user).toContain("Dell XPS 13");
    expect(p.system).toContain("$80 or more");
    expect(p.system).not.toMatch(/impulse/i);
    expect(p.system).toMatch(/refurbished/i);
    expect(p.system).toMatch(/buy-before-prices-rise/);
  });
  it("holiday mode does not require a technology, AI or work fit: any product type can be approved", () => {
    const system = buildFitPrompt({ ...input, mode: "holiday-plan" }).system;
    expect(system).toMatch(/any type/i);
    expect(system).not.toMatch(/tech-literate|audience fit|AI focus|general-tech/i);
  });
  it("a deal-framed target does not use the price-rise framing", () => {
    const p = buildFitPrompt({ ...input, target: DISCOVERY_TARGETS.headphones, mode: "holiday-plan" });
    expect(p.system).not.toMatch(/buy-before-prices-rise/);
  });
  it("never lets the model claim a discount", () => {
    expect(buildFitPrompt({ ...input, mode: "holiday-plan" }).system).toMatch(/Do not claim a discount/);
  });
  it("standing rotation keeps the original prompt: no price, impulse tier", () => {
    const p = buildFitPrompt({ ...input, mode: "standing-rotation" });
    expect(p.system).toMatch(/impulse-friendly/);
    expect(p.system).toMatch(/do not have price/);
    expect(p.user).not.toContain("$1139");
  });
});

describe("real-world demand for the engine's targets", () => {
  const all = Object.values(DISCOVERY_TARGETS);

  it("every target has a Google term, short where the Amazon search is long, and the anchor stands for laptops", () => {
    expect(trendTermOf(DISCOVERY_TARGETS.laptops)).toBe("laptop");
    expect(trendTermOf(DISCOVERY_TARGETS["creator-mics"])).toBe("podcast microphone");
    expect(trendTermOf(DISCOVERY_TARGETS["air-fryers"])).toBe("air fryer"); // same as the Amazon search
    const terms = allTrendTerms();
    expect(terms).not.toContain("laptop"); // the anchor rides along in every request
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms.length).toBe(all.length - 1);
  });

  it("gives more weight to a product type with more interest than the typical one, and less to one with less", () => {
    const ratios = { smartwatch: 0.4, headphones: 0.4, "air fryer": 0.54, "robot vacuum": 0.04, "electric toothbrush": 0.03, monitor: 0.2 };
    const factors = demandFactors(all, ratios);
    expect(factors["air-fryers"]).toBeGreaterThan(1);
    expect(factors["robot-vacuums"]).toBeLessThan(1);
    expect(factors["toothbrushes"]).toBeLessThanOrEqual(factors["robot-vacuums"]); // both far below the typical type: held at the 0.7 floor
    expect(factors.laptops).toBeGreaterThan(1); // the anchor is 1.0 against smaller multiples
    for (const f of Object.values(factors)) {
      expect(f).toBeGreaterThanOrEqual(0.7);
      expect(f).toBeLessThanOrEqual(1.5);
    }
  });

  it("leaves a target nobody measured alone, and gives no opinion when too few were measured to compare", () => {
    const some = demandFactors(all, { "air fryer": 0.5, "robot vacuum": 0.1, smartwatch: 0.3 });
    expect(some.phones).toBeUndefined();
    expect(demandFactors(all, { "air fryer": 0.5 })).toEqual({});
    expect(demandFactors(all, null)).toEqual({});
  });

  it("a demand-led day can search a different product type than a demand-blind one", () => {
    const base = Date.parse("2026-11-10T14:45:00Z");
    const hot = demandFactors(all, { smartwatch: 0.05, headphones: 0.05, "air fryer": 1.5, "robot vacuum": 0.05, laptop: 1 });
    let differs = 0;
    for (let d = 0; d < 40; d += 2) {
      const t = base + d * 86_400_000;
      const blind = pickTargets(t, std).targets.map((x) => x.key).join();
      const led = pickTargets(t, std, null, hot).targets.map((x) => x.key).join();
      if (blind !== led) differs += 1;
    }
    expect(differs).toBeGreaterThan(0);
  });
});
