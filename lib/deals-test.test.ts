import { describe, expect, it } from "vitest";
import {
  MAX_ACTIVATIONS_PER_DAY,
  MAX_ACTIVE,
  MAX_LIFE_DAYS,
  MAX_PER_CATEGORY,
  MIN_LIFE_DAYS,
  MIN_READ_IMPRESSIONS,
  TEST_CATEGORIES,
  planDay,
  shelfLifeDays,
  termsByCategory,
  testActive,
  type ActiveTest,
  type PlanInput,
  type Proposal,
} from "./deals-test";
import {
  ANCHOR_TERM,
  MONTHLY_SEARCHES,
  RESERVE_SEARCHES,
  blendDemand,
  blendStoredDemand,
  chunkTerms,
  dailyPlan,
  demandByCategory,
  fetchDemandChunk,
  meanInterest,
  mergeDemand,
  ratiosAgainstAnchor,
  searchesLeft,
  type DemandResult,
} from "./demand-signal";

const TODAY = "2026-11-20";
const at = (iso: string) => Date.parse(`${iso}T18:00:00Z`);

const proposal = (id: string, category: string, extra: Partial<Proposal> = {}): Proposal => ({
  id,
  name: id,
  category,
  createdAt: "2026-11-15T10:00:00Z",
  hasImage: true,
  hasTag: true,
  ...extra,
});
const onShelf = (id: string, category: string, activatedDay: string, impressions = 0, clicks = 0): ActiveTest => ({ id, category, activatedDay, impressions, clicks });
const input = (extra: Partial<PlanInput> = {}): PlanInput => ({
  today: TODAY,
  active: [],
  proposals: [],
  baseline: { impressions: 1000, clicks: 20 }, // 2%
  demand: null,
  avgImpressionsPerProductDay: 3,
  ...extra,
});

describe("when the test runs", () => {
  it("only inside Nov 12 - Jan 3, and never with the kill switch", () => {
    expect(testActive(at("2026-11-11"), undefined)).toBe(false);
    expect(testActive(at("2026-11-12"), undefined)).toBe(true);
    expect(testActive(at("2027-01-03"), undefined)).toBe(true);
    expect(testActive(at("2027-01-04"), undefined)).toBe(false);
    expect(testActive(at("2026-12-01"), "off")).toBe(false);
    expect(testActive(at("2026-12-01"), " OFF ")).toBe(false);
    expect(testActive(at("2026-12-01"), "on")).toBe(true);
  });
});

describe("shelf life follows our own traffic", () => {
  it("is two weeks with no data, a week at most when traffic is plentiful, three weeks at most when it is thin", () => {
    expect(shelfLifeDays(null)).toBe(14);
    expect(shelfLifeDays(0)).toBe(14);
    expect(shelfLifeDays(10)).toBe(MIN_LIFE_DAYS); // 3 days of exposure would do, but never under a week
    expect(shelfLifeDays(2)).toBe(Math.ceil(MIN_READ_IMPRESSIONS / 2));
    expect(shelfLifeDays(0.1)).toBe(MAX_LIFE_DAYS);
  });
});

describe("the daily plan", () => {
  it("fills at most three slots a day and spreads evenly with no demand signal", () => {
    const proposals = TEST_CATEGORIES.flatMap((c) => [proposal(`${c}-1`, c), proposal(`${c}-2`, c)]);
    const plan = planDay(input({ proposals }));
    expect(plan.activate).toHaveLength(MAX_ACTIVATIONS_PER_DAY);
    expect(new Set(plan.activate.map((a) => a.category)).size).toBe(MAX_ACTIVATIONS_PER_DAY);
    expect(plan.notes.join(" ")).toMatch(/no real-world demand signal/);
  });

  it("gives more slots to the type with more real-world demand, without letting it take the whole shelf", () => {
    const proposals = TEST_CATEGORIES.flatMap((c) => Array.from({ length: 6 }, (_, i) => proposal(`${c}-${i}`, c)));
    const demand = { "Home & Kitchen": 3, "Personal Care": 1, Travel: 0.6, "Wellness & Ergonomics": 0.5 };
    let active: ActiveTest[] = [];
    for (let day = 0; day < 4; day++) {
      const plan = planDay(input({ proposals, demand, active }));
      active = [...active, ...plan.activate.map((a) => onShelf(a.id, a.category, TODAY))];
    }
    const count = (c: string) => active.filter((a) => a.category === c).length;
    expect(active).toHaveLength(MAX_ACTIVE);
    expect(count("Home & Kitchen")).toBe(MAX_PER_CATEGORY);
    expect(count("Home & Kitchen")).toBeGreaterThan(count("Travel"));
    expect(count("Travel")).toBeGreaterThanOrEqual(1);
  });

  it("never exceeds the shelf size or a type's share", () => {
    const full = Array.from({ length: MAX_ACTIVE }, (_, i) => onShelf(`a${i}`, TEST_CATEGORIES[i % 4], TODAY));
    const plan = planDay(input({ active: full, proposals: [proposal("x", "Travel")] }));
    expect(plan.activate).toHaveLength(0);
    expect(plan.notes.join(" ")).toMatch(/shelf full/);
    const four = Array.from({ length: MAX_PER_CATEGORY }, (_, i) => onShelf(`h${i}`, "Home & Kitchen", TODAY));
    const capped = planDay(input({ active: four, proposals: [proposal("h9", "Home & Kitchen"), proposal("t1", "Travel")] }));
    expect(capped.activate.map((a) => a.id)).toEqual(["t1"]);
  });

  it("skips a proposal with no picture, no Associate tag, an old one, a hidden one or another category", () => {
    const plan = planDay(
      input({
        hidden: ["hid"],
        proposals: [
          proposal("noimg", "Travel", { hasImage: false }),
          proposal("notag", "Travel", { hasTag: false }),
          proposal("old", "Travel", { createdAt: "2026-09-01T00:00:00Z" }),
          proposal("hid", "Travel"),
          proposal("tech", "Monitors"),
          proposal("good", "Travel"),
        ],
      })
    );
    expect(plan.activate.map((a) => a.id)).toEqual(["good"]);
  });

  it("takes the oldest eligible proposal in a category first", () => {
    const plan = planDay(input({ proposals: [proposal("new", "Travel", { createdAt: "2026-11-19T00:00:00Z" }), proposal("old", "Travel", { createdAt: "2026-11-10T00:00:00Z" })] }));
    expect(plan.activate[0].id).toBe("old");
  });

  it("retires a product whose life is over with too few readers, and lets one that beat the rest graduate", () => {
    // avg 3/day -> life 10 days
    const plan = planDay(
      input({
        active: [
          onShelf("quiet", "Travel", "2026-11-05", 12, 0), // 15 days, thin: retire
          onShelf("winner", "Home & Kitchen", "2026-11-05", 40, 3), // 7.5% vs 2%: graduate
          onShelf("meh", "Personal Care", "2026-11-05", 50, 0), // read enough but below the rest: retire
          onShelf("fresh", "Travel", "2026-11-18", 2, 0), // 2 days: keep
        ],
      })
    );
    expect(plan.lifeDays).toBe(10);
    expect(plan.graduate.map((g) => g.id)).toEqual(["winner"]);
    expect(plan.retire.map((r) => r.id).sort()).toEqual(["meh", "quiet"]);
    expect(plan.keep).toBe(1);
  });

  it("retires a product that was never shown after a week, but not before", () => {
    const plan = planDay(input({ active: [onShelf("ghost", "Travel", "2026-11-12", 0), onShelf("young", "Travel", "2026-11-17", 0)], avgImpressionsPerProductDay: 0.2 }));
    expect(plan.retire.map((r) => r.id)).toEqual(["ghost"]);
    expect(plan.retire[0].reason).toMatch(/never shown/);
  });

  it("frees slots for the same day's activations when products leave", () => {
    const full = Array.from({ length: MAX_ACTIVE }, (_, i) => onShelf(`a${i}`, TEST_CATEGORIES[i % 4], i < 2 ? "2026-10-01" : TODAY, 5, 0));
    const plan = planDay(input({ active: full, proposals: [proposal("n1", "Travel"), proposal("n2", "Personal Care")] }));
    expect(plan.retire).toHaveLength(2);
    expect(plan.activate).toHaveLength(2);
  });

  it("the Trends terms for each test category come from the discovery targets", () => {
    const terms = termsByCategory();
    expect(terms["Home & Kitchen"]).toEqual(expect.arrayContaining(["espresso machine", "air fryer", "robot vacuum"]));
    expect(terms.Travel).toEqual(["carry on luggage"]);
    expect(terms["Personal Care"]).toEqual(["electric toothbrush"]);
  });
});

describe("real-world demand from search interest", () => {
  const response = (series: Record<string, number[]>) => ({
    interest_over_time: {
      timeline_data: series.laptop.map((_, i) => ({
        values: Object.entries(series).map(([query, values]) => ({ query, value: String(values[i]), extracted_value: values[i] })),
      })),
    },
  });

  it("averages each query over the timeline and reports a multiple of the anchor", () => {
    const means = meanInterest(response({ laptop: [50, 70], "air fryer": [30, 30], "robot vacuum": [10, 20] }));
    expect(means).toEqual({ laptop: 60, "air fryer": 30, "robot vacuum": 15 });
    expect(ratiosAgainstAnchor(means)).toEqual({ "air fryer": 0.5, "robot vacuum": 0.25 });
  });

  it("gives nothing when the anchor had no interest, or the response is empty or malformed", () => {
    expect(ratiosAgainstAnchor({ laptop: 0, x: 5 })).toEqual({});
    expect(meanInterest(null)).toEqual({});
    expect(meanInterest({ interest_over_time: {} })).toEqual({});
  });

  it("splits terms into requests of four plus the anchor, without repeats", () => {
    const chunks = chunkTerms(["a", "b", "c", "d", "e", "A", ANCHOR_TERM]);
    expect(chunks).toEqual([["a", "b", "c", "d"], ["e"]]);
  });

  it("makes exactly one request for one chunk, with the anchor in it", async () => {
    const urls: string[] = [];
    const fakeFetch = (async (url: string) => {
      urls.push(url);
      const q = decodeURIComponent(url.split("q=")[1].split("&")[0]).split(",");
      return { ok: true, json: async () => response(Object.fromEntries(q.map((t) => [t, t === "laptop" ? [100, 100] : [50, 50]]))) };
    }) as unknown as typeof fetch;
    const result = await fetchDemandChunk(["a", "b", "c", "d"], "KEY", fakeFetch, at("2026-11-12"));
    expect(urls).toHaveLength(1);
    expect(decodeURIComponent(urls[0])).toContain("q=laptop,a,b,c,d");
    expect(result?.ratios).toEqual({ a: 0.5, b: 0.5, c: 0.5, d: 0.5 });
    expect(result?.terms).toEqual(["a", "b", "c", "d"]);
    expect(result?.source).toBe("serpapi");
  });

  it("makes no request at all for an empty chunk", async () => {
    let calls = 0;
    const counting = (async () => {
      calls++;
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
    expect(await fetchDemandChunk([], "KEY", counting)).toBeNull();
    expect(calls).toBe(0);
  });

  it("fails loudly on a bad response instead of inventing numbers", async () => {
    const failing = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(fetchDemandChunk(["a"], "KEY", failing)).rejects.toThrow(/429/);
  });

  it("asks for the window it was told to: 3 months by default, 7 days when recent", async () => {
    const urls: string[] = [];
    const fakeFetch = (async (url: string) => {
      urls.push(decodeURIComponent(url));
      return { ok: true, json: async () => response({ laptop: [100], a: [50] }) };
    }) as unknown as typeof fetch;
    await fetchDemandChunk(["a"], "KEY", fakeFetch);
    const recent = await fetchDemandChunk(["a"], "KEY", fakeFetch, at("2026-11-12"), "recent");
    expect(urls[0]).toContain("date=today 3-m");
    expect(urls[1]).toContain("date=now 7-d");
    expect(recent?.window).toBe("recent");
  });

  it("plans three searches a day: the test shelf's last 7 days, and one group of every discovery term's 3 months by turns", () => {
    const shelf = ["a", "b", "c", "d", "e", "f"];
    const all = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
    const day = (n: number) => dailyPlan(shelf, all, n).map((p) => `${p.window}:${p.chunk.join("")}`);
    expect(day(0)).toEqual(["recent:abcd", "recent:ef", "baseline:abcd"]);
    expect(day(1)).toEqual(["recent:abcd", "recent:ef", "baseline:efgh"]);
    expect(day(3)).toEqual(["recent:abcd", "recent:ef", "baseline:mn"]);
    expect(day(4)).toEqual(["recent:abcd", "recent:ef", "baseline:abcd"]);
    expect(dailyPlan([], [], 3)).toEqual([]);
    expect(dailyPlan(shelf, [], 1).map((p) => p.window)).toEqual(["recent", "recent", "baseline"]); // no baseline list: the shelf's own
  });

  it("stays inside the free plan with room to spare: the season is about 160 searches, the reserve is kept", () => {
    const seasonDays = 53; // Nov 12 - Jan 3
    const perDay = dailyPlan(["a", "b", "c", "d", "e", "f"], ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"], 0).length;
    expect(perDay).toBe(3);
    expect(perDay * seasonDays).toBeLessThan(2 * (MONTHLY_SEARCHES - RESERVE_SEARCHES)); // two billing months
    expect(perDay * 30).toBeLessThan(MONTHLY_SEARCHES - RESERVE_SEARCHES - 100); // at least 100 of overhead a month
  });

  it("keeps every term's newest ratio per window across the daily requests", () => {
    const r = (fetchedAt: string, ratios: Record<string, number>, window?: "baseline" | "recent"): DemandResult => ({ source: "serpapi", fetchedAt, anchor: "laptop", window, terms: Object.keys(ratios), ratios });
    const rows = [r("2026-11-14", { a: 0.9, c: 0.2 }), r("2026-11-13", { a: 0.5, b: 0.4 }), r("2026-11-14", { a: 2 }, "recent")];
    expect(mergeDemand(rows)).toEqual({ a: 0.9, b: 0.4, c: 0.2 });
    expect(mergeDemand(rows, "recent")).toEqual({ a: 2 });
  });

  it("nudges the 3-month level by the last week, capped, and leaves a term with no recent reading alone", () => {
    expect(blendDemand({ a: 0.4, b: 0.4, c: 0.4, d: 0.4 }, { a: 0.8, b: 0.1, c: 0.44 })).toEqual({ a: 0.6, b: 0.3, c: 0.44, d: 0.4 });
    expect(blendDemand({ a: 0 }, { a: 1 })).toEqual({ a: 0 });
  });

  it("blends demand from the stored notes, skipping any it cannot read", () => {
    const row = (window: string, ratios: Record<string, number>, at: string) => JSON.stringify({ source: "serpapi", fetchedAt: at, anchor: "laptop", window, terms: Object.keys(ratios), ratios });
    expect(blendStoredDemand([row("baseline", { a: 0.4 }, "2026-11-13"), "not json", null, row("recent", { a: 0.8 }, "2026-11-14")])).toEqual({ a: 0.6 });
    expect(blendStoredDemand([])).toEqual({});
  });

  it("reads the remaining searches from the account, and says null when it cannot", async () => {
    const ok = (async () => ({ ok: true, json: async () => ({ plan_searches_left: 240, total_searches_left: 240 }) })) as unknown as typeof fetch;
    const bad = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    const broken = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await searchesLeft("KEY", ok)).toBe(240);
    expect(await searchesLeft("KEY", bad)).toBeNull();
    expect(await searchesLeft("KEY", broken)).toBeNull();
  });

  it("a category's demand is its strongest measured term; unmeasured categories are left out", () => {
    expect(demandByCategory({ "air fryer": 0.8, "robot vacuum": 0.3 }, { "Home & Kitchen": ["air fryer", "robot vacuum"], Travel: ["carry on luggage"] })).toEqual({
      "Home & Kitchen": 0.8,
    });
  });
});
