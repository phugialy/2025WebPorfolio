import { describe, expect, it } from "vitest";
import {
  DISCOVERY_PRICE_FLOOR,
  DISCOVERY_TARGETS,
  HOLIDAY_TARGETS_PER_RUN,
  MARKET_SCAN_FLAG,
  PLAN_WINDOWS,
  buildFitPrompt,
  meetsPriceFloor,
  pickTargets,
  planWindowFor,
  priceValue,
  shouldClearProposalFlag,
} from "./discovery-plan";
import { SECTIONS, defaultTagsFor, sectionSlugFor } from "./deals-core";

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

  it("every target files into a Deals section, so a product it finds can reach the Deals pages", () => {
    for (const t of Object.values(DISCOVERY_TARGETS)) {
      expect(sectionSlugFor(t.category), `${t.key} -> ${t.category}`).not.toBe("more");
      expect(defaultTagsFor(t.category)).toContain("technology");
    }
  });

  it("the new section is on the holiday lists", () => {
    expect(SECTIONS.some((s) => s.slug === "laptops-wearables")).toBe(true);
    expect(defaultTagsFor("Laptops")).toEqual(expect.arrayContaining(["black-friday", "cyber-monday", "thanksgiving-week"]));
  });

  it("holiday picks apply the $100 floor and spend two searches", () => {
    const pick = pickTargets(at("2026-11-09"), std);
    expect(pick.mode).toBe("holiday-plan");
    expect(pick.priceFloor).toBe(DISCOVERY_PRICE_FLOOR);
    expect(pick.targets).toHaveLength(HOLIDAY_TARGETS_PER_RUN);
    expect(pick.targets.map((t) => t.key)).toEqual(["laptops", "smartwatches"]);
  });

  it("walks the window's priority list two steps per day and wraps", () => {
    const keys = (d: string) => pickTargets(at(d), std).targets.map((t) => t.key);
    expect(keys("2026-11-10")).toEqual(["headphones", "creator-mics"]);
    expect(keys("2026-11-11")).toEqual(["mini-pcs", "monitors"]);
    expect(keys("2026-11-12")).toEqual(["earbuds", "laptops"]);
  });

  it("covers every target in a window over its days (no target is starved)", () => {
    for (const w of PLAN_WINDOWS) {
      const days = Math.round((Date.parse(w.to) - Date.parse(w.from)) / 86_400_000);
      const seen = new Set<string>();
      for (let d = 0; d < days; d += 1) {
        for (const t of pickTargets(Date.parse(`${w.from}T00:00:00Z`) + d * 86_400_000 + 3_600_000, std).targets) seen.add(t.key);
      }
      for (const key of w.targets) expect(seen.has(key), `${w.from}: ${key}`).toBe(true);
    }
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
  it("the floor passes at exactly $100, fails below, and fails when the price is unknown", () => {
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
    expect(p.system).toContain("$100 or more");
    expect(p.system).not.toMatch(/impulse/i);
    expect(p.system).toMatch(/refurbished/i);
    expect(p.system).toMatch(/buy-before-prices-rise/);
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
