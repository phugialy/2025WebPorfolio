import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";
import { DISCOVERY_TARGETS, MARKET_SCAN_FLAG, pickTargets } from "@/lib/discovery-plan";

const h = vi.hoisted(() => ({
  client: null as unknown,
  search: vi.fn(),
  model: vi.fn(),
  trend: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));
vi.mock("@/lib/canopy", async (original) => ({
  ...(await original<typeof import("@/lib/canopy")>()),
  searchCanopy: h.search,
}));
vi.mock("@/lib/openrouter", () => ({ generateOpenRouterText: h.model }));
vi.mock("@/lib/trend-signals", () => ({ getTrendingKeywords: h.trend }));

import { discoverTrendingByCategory } from "@/lib/market-intelligence";
import { GET } from "@/app/api/cron/market-intelligence/route";

const HOLIDAY = Date.parse("2026-11-10T14:45:00Z");
const OFF_SEASON = Date.parse("2026-06-02T14:45:00Z");
const HOUR = 3_600_000;
const STD = ["AI Engineering", "AI Hardware", "Keyboards", "Monitors", "Input Devices", "Docking & Hubs"];

const result = (asin: string, title: string, price: number | null, extra: Record<string, unknown> = {}) => ({
  asin,
  title,
  sponsored: false,
  rating: 4.6,
  ratingsTotal: 900,
  mainImageUrl: `https://img/${asin}.jpg`,
  price: price === null ? null : { value: price, currency: "USD", display: `$${price}` },
  ...extra,
});

function setUp(tables: Record<string, Record<string, unknown>[]> = {}): FakeSupabase {
  const db = createFakeSupabase({
    tables: { affiliate_products: [], cron_runs: [], ...tables },
    jsonColumns: { articles: ["tags"] },
  });
  h.client = db;
  return db;
}

const approve = (reasoning = "A current, well-known product.") =>
  ({ content: JSON.stringify({ approved: true, reasoning }) }) as { content: string };
const reject = (reasoning = "Not a fit.") => ({ content: JSON.stringify({ approved: false, reasoning }) });

beforeEach(() => {
  h.search.mockReset();
  h.model.mockReset();
  h.trend.mockReset();
  h.trend.mockResolvedValue([{ keyword: "ai engineering", source: "x", rank: 1 }]);
  process.env.AMAZON_ASSOCIATE_TAG = "phugialy-20";
});

describe("discovery during the holiday plan", () => {
  it("searches exactly the plan's two targets for today, in Amazon search language", async () => {
    setUp();
    h.search.mockResolvedValue([]);
    const out = await discoverTrendingByCategory(HOLIDAY);
    const expected = pickTargets(HOLIDAY, STD).targets;
    expect(out.mode).toBe("holiday-plan");
    expect(h.search).toHaveBeenCalledTimes(2);
    expect(h.search.mock.calls.map((c) => c[0])).toEqual(expected.map((t) => t.searchTerm));
    expect(out.targets).toEqual(expected.map((t) => t.key));
  });

  it("never sends a candidate under $100, or with no price, to the model", async () => {
    setUp();
    h.search.mockResolvedValue([
      result("B0CHEAP001", "Cheap thing", 49.99),
      result("B0NOPRICE1", "Mystery price", null),
      result("B0EXACT100", "Exactly one hundred", 100),
      result("B0PRICEY01", "Expensive thing", 799),
    ]);
    h.model.mockResolvedValue(reject());
    await discoverTrendingByCategory(HOLIDAY);
    const sent = h.model.mock.calls.map((c) => c[0][1].content as string).join("\n");
    expect(sent).toContain("Exactly one hundred");
    expect(sent).toContain("Expensive thing");
    expect(sent).not.toContain("Cheap thing");
    expect(sent).not.toContain("Mystery price");
  });

  it("proposes an approved product as an inactive, flagged catalog row, with no price stored", async () => {
    const db = setUp();
    h.search.mockResolvedValueOnce([result("B0GOOD0001", "Apple Watch SE 3 GPS 40mm Smartwatch", 239.99)]).mockResolvedValue([]);
    h.model.mockResolvedValue(approve("Current-generation, established brand."));
    const out = await discoverTrendingByCategory(HOLIDAY);

    expect(out.discovered).toBe(1);
    expect(db.tables.affiliate_products).toHaveLength(1);
    const row = db.tables.affiliate_products[0];
    expect(row).toMatchObject({
      name: "Apple Watch SE 3 GPS 40mm Smartwatch",
      network: "amazon",
      status: "inactive",
      flag_reason: MARKET_SCAN_FLAG,
      discovery_reasoning: "Current-generation, established brand.",
      affiliate_url: "https://www.amazon.com/dp/B0GOOD0001?tag=phugialy-20",
    });
    const firstTarget = pickTargets(HOLIDAY, STD).targets[0];
    expect(row.category).toBe(firstTarget.category);
    // No price is stored anywhere on the row, and none is shown to readers.
    expect(JSON.stringify(row)).not.toMatch(/239/);
  });

  it("gives the model the real price and the category's existing products", async () => {
    const firstTarget = pickTargets(HOLIDAY, STD).targets[0];
    setUp({
      affiliate_products: [
        {
          id: "existing",
          name: "Existing Catalog Item XYZ",
          category: firstTarget.category,
          status: "active",
          affiliate_url: "https://www.amazon.com/dp/B0EXISTING1",
        },
      ],
    });
    h.search.mockResolvedValueOnce([result("B0NEW00001", "Some New Product", 349)]).mockResolvedValue([]);
    h.model.mockResolvedValue(reject());
    await discoverTrendingByCategory(HOLIDAY);
    const [system, user] = h.model.mock.calls[0][0] as { content: string }[];
    expect(user.content).toContain("$349");
    expect(user.content).toContain("Existing Catalog Item XYZ");
    expect(system.content).toContain("$80 or more");
    expect(system.content).not.toMatch(/impulse/i);
  });

  it("skips a product already in the catalog under any URL form, without paying for a model call", async () => {
    setUp({
      affiliate_products: [
        { id: "x", name: "Hand-added", category: "Audio", status: "inactive", affiliate_url: "https://www.amazon.com/dp/B0ALREADY1/ref=foo?tag=other-20" },
      ],
    });
    h.search.mockResolvedValueOnce([result("B0ALREADY1", "Already here", 300)]).mockResolvedValue([]);
    h.model.mockResolvedValue(approve());
    await discoverTrendingByCategory(HOLIDAY);
    expect(h.model).not.toHaveBeenCalled();
  });

  it("evaluates the same product once when a search lists it twice", async () => {
    setUp();
    h.search
      .mockResolvedValueOnce([result("B0DUPLICAT", "Apple Watch SE 3", 239), result("B0DUPLICAT", "Apple Watch SE 3", 239)])
      .mockResolvedValue([]);
    h.model.mockResolvedValue(reject());
    await discoverTrendingByCategory(HOLIDAY);
    expect(h.model).toHaveBeenCalledTimes(1);
  });

  it("a rejected product is not inserted", async () => {
    const db = setUp();
    h.search.mockResolvedValueOnce([result("B0REJECT01", "Renewed old thing", 180)]).mockResolvedValue([]);
    h.model.mockResolvedValue(reject("Renewed unit."));
    const out = await discoverTrendingByCategory(HOLIDAY);
    expect(out.discovered).toBe(0);
    expect(db.tables.affiliate_products).toHaveLength(0);
    expect(out.log.join("\n")).toContain("Renewed unit.");
  });

  it("one failed search does not stop the other target", async () => {
    setUp();
    h.search.mockRejectedValueOnce(new Error("Canopy search failed: HTTP 429")).mockResolvedValueOnce([result("B0SECOND01", "Second target product", 300)]);
    h.model.mockResolvedValue(approve());
    const out = await discoverTrendingByCategory(HOLIDAY);
    expect(out.log.join("\n")).toContain("HTTP 429");
    expect(out.discovered).toBe(1);
  });
});

describe("discovery dry run", () => {
  it("runs the real search and the real judgment but writes nothing", async () => {
    const db = setUp();
    h.search.mockResolvedValueOnce([result("B0DRYRUN01", "Dry run product", 400)]).mockResolvedValue([]);
    h.model.mockResolvedValue(approve("Would be fine."));
    const out = await discoverTrendingByCategory(HOLIDAY, { dryRun: true });
    expect(out.dryRun).toBe(true);
    expect(out.discovered).toBe(1);
    expect(out.log.join("\n")).toContain("[dry run] Would propose");
    expect(h.model).toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });
});

describe("discovery when the model is unavailable", () => {
  it("fails the run loudly instead of rejecting everything and reporting ok", async () => {
    const db = setUp();
    h.search.mockResolvedValue([result("B0OUTAGE01", "Fine product", 300)]);
    h.model.mockRejectedValue(new Error("OpenRouter request failed: 404 anthropic/claude-3.5-sonnet is no longer available"));
    await expect(discoverTrendingByCategory(HOLIDAY)).rejects.toThrow(/Model unavailable: all \d+ evaluations failed/);
    expect(db.tables.affiliate_products).toHaveLength(0);
  });

  it("the cron route logs that failure as a failed run", async () => {
    const db = setUp();
    process.env.CRON_SECRET = "s";
    h.search.mockResolvedValue([result("B0OUTAGE02", "Fine product", 300)]);
    h.model.mockRejectedValue(new Error("404 model retired"));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(HOLIDAY);
    try {
      const res = await GET(new NextRequest("http://localhost/api/cron/market-intelligence", { headers: { authorization: "Bearer s" } }));
      expect(res.status).toBe(500);
      expect(db.tables.cron_runs).toHaveLength(1);
      expect(db.tables.cron_runs[0]).toMatchObject({ job: "market-intelligence", ok: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("a model that answers 'no' to everything is a normal run, not an outage", async () => {
    setUp();
    h.search.mockResolvedValue([result("B0NORMAL01", "Meh product", 300)]);
    h.model.mockResolvedValue(reject("Not a fit."));
    await expect(discoverTrendingByCategory(HOLIDAY)).resolves.toMatchObject({ discovered: 0 });
  });
});

describe("the live snapshot from rotate-deals", () => {
  const snapshotRow = (ageHours: number, factors: Record<string, number>) => ({
    job: "rotate-deals",
    ok: true,
    created_at: new Date(HOLIDAY - ageHours * HOUR).toISOString(),
    summary: { planSnapshot: { epoch: 1, computedAt: "x", factors } },
  });

  it("is read and reported, so the run says which live signal it used", async () => {
    setUp({ cron_runs: [snapshotRow(10, { Monitors: 1.4, Audio: 0.7 })] });
    h.search.mockResolvedValue([]);
    const out = await discoverTrendingByCategory(HOLIDAY);
    expect(out.liveFactors).toEqual({ Monitors: 1.4, Audio: 0.7 });
  });

  it("is ignored when older than 72 hours: a stalled cron falls back to the plan alone", async () => {
    setUp({ cron_runs: [snapshotRow(80, { Monitors: 1.4 })] });
    h.search.mockResolvedValue([]);
    expect((await discoverTrendingByCategory(HOLIDAY)).liveFactors).toEqual({});
  });

  it("ignores a failed rotate-deals run", async () => {
    setUp({ cron_runs: [{ ...snapshotRow(5, { Monitors: 1.4 }), ok: false }] });
    h.search.mockResolvedValue([]);
    expect((await discoverTrendingByCategory(HOLIDAY)).liveFactors).toEqual({});
  });

  it("steers today's targets: the run draws exactly what the plan draws with that snapshot", async () => {
    // Find live factors that really do change today's draw, then check the run used them.
    const categories = [...new Set(Object.values(DISCOVERY_TARGETS).map((t) => t.category))];
    const plain = pickTargets(HOLIDAY, STD).targets.map((t) => t.key);
    let factors: Record<string, number> | null = null;
    for (let mask = 0; mask < 2 ** categories.length && !factors; mask += 1) {
      const candidate = Object.fromEntries(categories.map((c, i) => [c, mask & (1 << i) ? 1.5 : 0.7]));
      const drawn = pickTargets(HOLIDAY, STD, { epoch: 1, computedAt: "x", factors: candidate }).targets.map((t) => t.key);
      if (drawn.join() !== plain.join()) factors = candidate;
    }
    expect(factors).not.toBeNull();

    setUp({ cron_runs: [snapshotRow(10, factors!)] });
    h.search.mockResolvedValue([]);
    const steered = await discoverTrendingByCategory(HOLIDAY);
    expect(steered.targets).toEqual(
      pickTargets(HOLIDAY, STD, { epoch: 1, computedAt: "x", factors: factors! }).targets.map((t) => t.key)
    );
    expect(steered.targets.join()).not.toBe(plain.join());
  });
});

describe("discovery outside the season", () => {
  it("is the original rotation: one search with the trend keyword, no price floor, the original prompt", async () => {
    setUp();
    h.search.mockResolvedValue([result("B0CHEAPOK1", "A $19 keyboard", 19)]);
    h.model.mockResolvedValue(reject());
    const out = await discoverTrendingByCategory(OFF_SEASON);
    expect(out.mode).toBe("standing-rotation");
    expect(h.search).toHaveBeenCalledTimes(1);
    expect(h.search).toHaveBeenCalledWith("ai engineering");
    expect(h.model).toHaveBeenCalledTimes(1);
    const [system] = h.model.mock.calls[0][0] as { content: string }[];
    expect(system.content).toMatch(/impulse-friendly/);
  });
});
