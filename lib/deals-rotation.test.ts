import { describe, expect, it } from "vitest";
import {
  FACTOR_MAX,
  FACTOR_MIN,
  FRESH_DAYS,
  MIN_SIGNAL_CLICKS,
  PLAN_MULTIPLIER,
  buildPlanSnapshot,
  categoryFactors,
  displayWeight,
  freshnessMultiplier,
  planCategories,
  rotationBucket,
  rotationKey,
  rotationKeys,
  rotationStart,
} from "./deals-rotation";
import {
  ANCHORS,
  filterExplorer,
  getHoliday,
  holidayTop,
  shownOrder,
  topOverall,
  type ExplorerItem,
  type ScoredProduct,
} from "./deals-core";

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(iso);

const product = (id: string, score: number, extra: Partial<ScoredProduct> = {}): ScoredProduct => ({
  id,
  name: `Product ${id}`,
  category: "AI Hardware",
  image_url: null,
  description: null,
  buy_if: null,
  is_partner: false,
  flag_reason: null,
  score,
  previous: 0,
  rising: false,
  ...extra,
});

/** Attach this bucket's rotation keys the way lib/deals.ts does. */
const withRotation = (list: ScoredProduct[], now: number): ScoredProduct[] => {
  const keys = rotationKeys(list, now);
  return list.map((p) => ({ ...p, rotation: keys.get(p.id) ?? 0 }));
};

describe("the rotation schedule", () => {
  it("holds still inside a day and changes at 05:00 UTC", () => {
    const a = rotationBucket(utc("2026-11-10T05:00:00Z"));
    expect(rotationBucket(utc("2026-11-10T23:59:59Z"))).toBe(a);
    expect(rotationBucket(utc("2026-11-11T04:59:59Z"))).toBe(a);
    expect(rotationBucket(utc("2026-11-11T05:00:00Z"))).toBe(a + 1);
    expect(rotationBucket(utc("2026-11-10T04:59:59Z"))).toBe(a - 1);
  });
  it("a bucket starts at 05:00 UTC", () => {
    const b = rotationBucket(utc("2026-11-10T12:00:00Z"));
    expect(new Date(rotationStart(b)).toISOString()).toBe("2026-11-10T05:00:00.000Z");
  });
});

describe("weights", () => {
  const NOW = utc("2026-11-10T12:00:00Z");
  it("a new product gets 2x, fading to 1x over the fresh window", () => {
    expect(freshnessMultiplier(new Date(NOW).toISOString(), NOW)).toBeCloseTo(2);
    expect(freshnessMultiplier(new Date(NOW - (FRESH_DAYS / 2) * DAY).toISOString(), NOW)).toBeCloseTo(1.5);
    expect(freshnessMultiplier(new Date(NOW - FRESH_DAYS * DAY).toISOString(), NOW)).toBe(1);
    expect(freshnessMultiplier(new Date(NOW - 90 * DAY).toISOString(), NOW)).toBe(1);
  });
  it("ignores missing, unreadable and future dates", () => {
    expect(freshnessMultiplier(null, NOW)).toBe(1);
    expect(freshnessMultiplier(undefined, NOW)).toBe(1);
    expect(freshnessMultiplier("not a date", NOW)).toBe(1);
    expect(freshnessMultiplier(new Date(NOW + DAY).toISOString(), NOW)).toBe(1);
  });
  it("momentum is tempered: 100 clicks weighs about 11x, not 100x", () => {
    const none = displayWeight({ id: "a", score: 0, category: null }, NOW, new Set());
    const busy = displayWeight({ id: "b", score: 100, category: null }, NOW, new Set());
    expect(none).toBe(1);
    expect(busy).toBeCloseTo(11);
  });
  it("a category in today's plan gets the plan boost", () => {
    const plan = planCategories(NOW);
    expect(plan.has("Laptops")).toBe(true);
    const inPlan = displayWeight({ id: "a", score: 0, category: "Laptops" }, NOW, plan);
    const outside = displayWeight({ id: "b", score: 0, category: "Keyboards" }, NOW, plan);
    expect(inPlan / outside).toBeCloseTo(PLAN_MULTIPLIER);
  });
  it("there is no plan boost outside the season", () => {
    expect(planCategories(utc("2026-06-01T12:00:00Z")).size).toBe(0);
  });
});

describe("live category performance", () => {
  const cat = (category: string, count: number, scoreEach: number) =>
    Array.from({ length: count }, () => ({ category, score: scoreEach }));

  it("gives no opinion until there is enough data to trust", () => {
    expect(categoryFactors([...cat("A", 5, 1), ...cat("B", 5, 1)])).toEqual({});
    expect(MIN_SIGNAL_CLICKS).toBeGreaterThan(5);
    expect(categoryFactors([])).toEqual({});
  });
  it("a category earning its share is 1; over-performing above, under-performing below", () => {
    const f = categoryFactors([...cat("A", 10, 3), ...cat("B", 10, 3)]);
    expect(f.A).toBeCloseTo(1);
    expect(f.B).toBeCloseTo(1);
    const skew = categoryFactors([...cat("Hot", 5, 8), ...cat("Cold", 15, 0.5), ...cat("Mid", 10, 1)]);
    expect(skew.Hot).toBeGreaterThan(1);
    expect(skew.Cold).toBeLessThan(1);
  });
  it("is bounded so a week of data can nudge the strategy but never flip it", () => {
    const f = categoryFactors([...cat("Huge", 1, 500), ...cat("Dead", 40, 0)]);
    expect(f.Huge).toBe(FACTOR_MAX);
    expect(f.Dead).toBe(FACTOR_MIN);
  });
  it("ignores products with no category, and a category with no products has no factor", () => {
    const f = categoryFactors([{ category: null, score: 40 }, ...cat("A", 3, 5)]);
    expect(f.A).toBeDefined();
    expect(Object.keys(f)).toEqual(["A"]);
    expect(f.Laptops).toBeUndefined();
  });
  it("feeds the display weight", () => {
    const NOW = utc("2026-06-01T12:00:00Z");
    const base = displayWeight({ id: "a", score: 4, category: "A" }, NOW, new Set());
    const hot = displayWeight({ id: "a", score: 4, category: "A" }, NOW, new Set(), { A: 1.5 });
    expect(hot / base).toBeCloseTo(1.5);
  });
  it("a snapshot records the 48-hour period it was computed for", () => {
    const now = utc("2026-11-10T12:00:00Z");
    const snap = buildPlanSnapshot([...cat("A", 10, 5), ...cat("B", 10, 1)], now);
    expect(snap.epoch).toBe(Math.floor(rotationBucket(now) / 2));
    expect(snap.computedAt).toBe(new Date(now).toISOString());
    expect(snap.factors.A).toBeGreaterThan(snap.factors.B);
  });
});

describe("rotation keys", () => {
  it("are stable inside a bucket, change between buckets, and stay above zero", () => {
    expect(rotationKey("p1", 3, 100)).toBe(rotationKey("p1", 3, 100));
    const seen = new Set(Array.from({ length: 20 }, (_, b) => rotationKey("p1", 3, b)));
    expect(seen.size).toBeGreaterThan(15);
    for (const k of seen) {
      expect(k).toBeGreaterThan(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });
  it("come back empty when rotation is off", () => {
    expect(rotationKeys([{ id: "a", score: 1, category: null }], Date.now(), { enabled: false }).size).toBe(0);
  });
});

describe("the shown order", () => {
  const catalog = [
    product("hot1", 20),
    product("hot2", 12),
    product("hot3", 8),
    ...Array.from({ length: 12 }, (_, i) => product(`quiet${i}`, 0)),
  ];

  it("with rotation off it is exactly the old order by activity", () => {
    const off = shownOrder(catalog, 2).map((p) => p.id);
    expect(off.slice(0, 3)).toEqual(["hot1", "hot2", "hot3"]);
    expect(off.slice(3)).toEqual([...off.slice(3)].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps the most-opened products first and rotates the rest", () => {
    for (let d = 0; d < 20; d += 1) {
      const order = shownOrder(withRotation(catalog, utc("2026-11-10T12:00:00Z") + d * DAY), 2).map((p) => p.id);
      expect(order.slice(0, 2)).toEqual(["hot1", "hot2"]);
    }
  });

  it("holds still inside one day and changes the next", () => {
    const morning = shownOrder(withRotation(catalog, utc("2026-11-10T06:00:00Z")), 2).map((p) => p.id);
    const night = shownOrder(withRotation(catalog, utc("2026-11-11T03:00:00Z")), 2).map((p) => p.id);
    const nextDay = shownOrder(withRotation(catalog, utc("2026-11-11T06:00:00Z")), 2).map((p) => p.id);
    expect(night).toEqual(morning);
    expect(nextDay).not.toEqual(morning);
  });

  it("does not starve: a product with no clicks reaches the first places over a couple of weeks", () => {
    const reached = new Set<string>();
    for (let d = 0; d < 14; d += 1) {
      const order = shownOrder(withRotation(catalog, utc("2026-11-10T12:00:00Z") + d * DAY), 2);
      for (const p of order.slice(2, 6)) reached.add(p.id);
    }
    // Before rotation these 4 slots were always the same alphabetical four.
    expect(reached.size).toBeGreaterThan(8);
  });

  it("a product with no clicks yet is never an anchor", () => {
    const allQuiet = Array.from({ length: 6 }, (_, i) => product(`q${i}`, 0));
    const a = shownOrder(withRotation(allQuiet, utc("2026-11-10T12:00:00Z")), 2).map((p) => p.id);
    const b = shownOrder(withRotation(allQuiet, utc("2026-11-12T12:00:00Z")), 2).map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("a new product surfaces more often than an old one with the same clicks", () => {
    const NOW = utc("2026-11-10T12:00:00Z");
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => product(`old${i}`, 0, { created_at: new Date(NOW - 90 * DAY).toISOString() })),
      product("fresh", 0, { created_at: new Date(NOW - DAY).toISOString() }),
    ];
    let freshInTop3 = 0;
    let oldInTop3 = 0;
    for (let d = 0; d < 300; d += 1) {
      const top = shownOrder(withRotation(pool, NOW + d * DAY), 0).slice(0, 3).map((p) => p.id);
      if (top.includes("fresh")) freshInTop3 += 1;
      if (top.includes("old0")) oldInTop3 += 1;
    }
    expect(freshInTop3).toBeGreaterThan(oldInTop3 * 1.2);
  });
});

describe("the lists", () => {
  const NOW = utc("2026-11-10T12:00:00Z");
  const list = withRotation(
    [
      product("a", 9),
      product("b", 7),
      product("c", 5),
      ...Array.from({ length: 10 }, (_, i) => product(`z${i}`, 0, { tags: ["black-friday"] })),
    ].map((p) => ({ ...p, tags: ["black-friday"] })),
    NOW
  );

  it("the overall list puts pins first, then anchors, and fills from the rotation", () => {
    const top = topOverall(list, 8, ["z3"]).map((p) => p.id);
    expect(top[0]).toBe("z3");
    expect(top.slice(1, 1 + ANCHORS.overall)).toEqual(["a", "b"]);
    expect(top).toHaveLength(8);
  });

  it("a holiday list keeps its three anchors and still has ten products", () => {
    const holiday = {
      ...getHoliday("black-friday")!,
      focus: [],
      sections: ["ai-computing"],
    };
    const top = holidayTop(holiday, list, 10, []).map((p) => p.id);
    expect(top.slice(0, ANCHORS.holiday)).toEqual(["a", "b", "c"]);
    expect(top).toHaveLength(10);
    expect(new Set(top).size).toBe(10);
  });
});

describe("browsing and searching", () => {
  const items: ExplorerItem[] = [
    ...[
      ["hot1", 9],
      ["hot2", 6],
      ["hot3", 4],
    ].map(([id, score]) => item(id as string, score as number)),
    ...Array.from({ length: 8 }, (_, i) => item(`quiet${i}`, 0)),
  ];

  function item(id: string, score: number, extra: Partial<ExplorerItem> = {}): ExplorerItem {
    return {
      id,
      name: `Gadget ${id}`,
      category: "Audio",
      section: "desk-workspace",
      image_url: null,
      buy_if: null,
      score,
      rising: false,
      tags: ["technology"],
      pinned: null,
      rotation: 0,
      ...extra,
    };
  }

  const keyed = (now: number) =>
    items.map((i) => ({ ...i, rotation: rotationKey(i.id, 1 + Math.sqrt(i.score), rotationBucket(now)) }));

  it("browsing keeps pins, then the two anchors, then rotates", () => {
    const rows = keyed(utc("2026-11-10T12:00:00Z")).map((i) => (i.id === "quiet4" ? { ...i, pinned: 1 } : i));
    const order = filterExplorer(rows, { query: "", sort: "trending" }).map((i) => i.id);
    expect(order.slice(0, 3)).toEqual(["quiet4", "hot1", "hot2"]);
    const other = filterExplorer(
      keyed(utc("2026-11-12T12:00:00Z")).map((i) => (i.id === "quiet4" ? { ...i, pinned: 1 } : i)),
      { query: "", sort: "trending" }
    ).map((i) => i.id);
    expect(other.slice(0, 3)).toEqual(["quiet4", "hot1", "hot2"]);
    expect(other.slice(3)).not.toEqual(order.slice(3));
  });

  it("a search is not shuffled: same order every day", () => {
    const day1 = filterExplorer(keyed(utc("2026-11-10T12:00:00Z")), { query: "gadget", sort: "trending" }).map((i) => i.id);
    const day2 = filterExplorer(keyed(utc("2026-11-14T12:00:00Z")), { query: "gadget", sort: "trending" }).map((i) => i.id);
    expect(day1).toEqual(day2);
    expect(day1.slice(0, 3)).toEqual(["hot1", "hot2", "hot3"]);
  });

  it("with no rotation keys, browsing is the old order", () => {
    const order = filterExplorer(items, { query: "", sort: "trending" }).map((i) => i.id);
    expect(order.slice(0, 3)).toEqual(["hot1", "hot2", "hot3"]);
  });
});
