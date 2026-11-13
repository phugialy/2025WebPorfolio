import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";
import { dayInEpoch, reevalEpoch } from "@/lib/rotation-core";

const h = vi.hoisted(() => ({ client: null as unknown, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: h.revalidateTag,
  revalidatePath: h.revalidatePath,
}));
vi.mock("@/lib/articles", () => ({ getGuideSummaries: async () => [] }));

import { GET } from "@/app/api/cron/rotate-deals/route";

const SECRET = "test-secret";
const DAY = 86_400_000;

// A catalog shaped like the real one: strategy categories with products, and a
// cheap category that earns clicks on very few products.
const CATEGORIES: Record<string, number> = { "AI Hardware": 5, Monitors: 4, Audio: 4, Keyboards: 3, "Cables & Chargers": 2 };

function buildCatalog(now: number) {
  const products: Record<string, unknown>[] = [];
  const clicks: Record<string, unknown>[] = [];
  let n = 0;
  for (const [category, count] of Object.entries(CATEGORIES)) {
    for (let i = 0; i < count; i += 1) {
      const id = `00000000-0000-4000-8000-${String(100 + n).padStart(12, "0")}`;
      products.push({
        id,
        name: `${category} product ${i}`,
        category,
        image_url: "https://example.com/p.jpg",
        description: null,
        buy_if: null,
        is_partner: false,
        flag_reason: null,
        network: "amazon",
        affiliate_url: `https://www.amazon.com/dp/B0TEST${n}`,
        promo_code: null,
        promo_details: null,
        brand: null,
        status: "active",
        created_at: new Date(now - 90 * DAY).toISOString(),
      });
      // Click activity: the first two products overall are clearly the most opened.
      const activity = n === 0 ? 12 : n === 1 ? 8 : n % 4 === 0 ? 3 : 0;
      for (let c = 0; c < activity; c += 1) {
        clicks.push({
          product_id: id,
          user_agent: `ua-${n}-${c}`,
          is_bot: false,
          created_at: new Date(now - DAY).toISOString(),
        });
      }
      n += 1;
    }
  }
  return { products, clicks };
}

function setUp(now: number, extra: { failOn?: Record<string, string> } = {}): FakeSupabase {
  const { products, clicks } = buildCatalog(now);
  const db = createFakeSupabase({
    tables: { affiliate_products: products, affiliate_clicks: clicks, deals_catalog: [], cron_runs: [] },
    failOn: extra.failOn,
  });
  h.client = db;
  return db;
}

async function run(path = "/api/cron/rotate-deals", secret: string | null = SECRET) {
  const req = new NextRequest(`http://localhost${path}`, { headers: secret ? { authorization: `Bearer ${secret}` } : {} });
  const res = await GET(req);
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

/** The first rotation day at or after `from` where a new 48-hour strategy period begins (06:00 UTC). */
function periodStart(from: string): number {
  let t = Date.parse(from);
  while (dayInEpoch(t) !== 0) t += DAY;
  return t;
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  delete process.env.DEALS_ROTATION;
  h.revalidateTag.mockClear();
  h.revalidatePath.mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
});

describe("rotate-deals: access", () => {
  it("refuses a request with no secret or the wrong one, and does nothing", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start);
    expect((await run("/api/cron/rotate-deals", null)).status).toBe(401);
    expect((await run("/api/cron/rotate-deals", "wrong")).status).toBe(401);
    expect(db.writes).toEqual([]);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });
});

describe("rotate-deals: a real run", () => {
  it("clears the cache, builds the lineup and logs one row with the strategy snapshot", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start);
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.reevaluated).toBe(true);
    expect(body.rotationEnabled).toBe(true);
    expect(h.revalidateTag).toHaveBeenCalledWith("deals");
    expect(h.revalidatePath).toHaveBeenCalledWith("/deals");

    const rows = db.tables.cron_runs;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ job: "rotate-deals", ok: true });
    const summary = rows[0].summary as { planSnapshot: { epoch: number; factors: Record<string, number> }; ids: string[] };
    expect(summary.planSnapshot.epoch).toBe(reevalEpoch(start));
    expect(summary.ids.length).toBeGreaterThan(5);
  });

  it("live factors cover only the categories the plan chases, never the cheap ones", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    setUp(start);
    const { body } = await run();
    const factors = body.planSnapshot.factors as Record<string, number>;
    expect(Object.keys(factors).sort()).toEqual(["AI Hardware", "Audio", "Monitors"]);
    expect(factors["Cables & Chargers"]).toBeUndefined();
    expect(factors["Keyboards"]).toBeUndefined();
    for (const f of Object.values(factors)) {
      expect(f).toBeGreaterThanOrEqual(0.7);
      expect(f).toBeLessThanOrEqual(1.5);
    }
  });
});

describe("rotate-deals: the 48-hour re-evaluation", () => {
  it("re-evaluates on day one, carries the snapshot on day two, re-evaluates again on day three", async () => {
    const day0 = periodStart("2026-11-10T06:00:00Z");
    const db = setUp(day0);

    vi.setSystemTime(day0);
    const first = await run();
    expect(first.body.reevaluated).toBe(true);

    vi.setSystemTime(day0 + DAY);
    const second = await run();
    expect(second.body.reevaluated).toBe(false);
    expect(second.body.planSnapshot).toEqual(first.body.planSnapshot);

    vi.setSystemTime(day0 + 2 * DAY);
    const third = await run();
    expect(third.body.reevaluated).toBe(true);
    expect(third.body.planSnapshot.epoch).toBe(first.body.planSnapshot.epoch + 1);
    expect(db.tables.cron_runs).toHaveLength(3);
  });

  it("builds a fresh snapshot when the carried one belongs to an older period (a missed run)", async () => {
    const day0 = periodStart("2026-11-10T06:00:00Z");
    const db = setUp(day0);
    vi.setSystemTime(day0);
    const first = await run();
    // Two days pass with no run, then the cron fires on the second day of a new period.
    vi.setSystemTime(day0 + 3 * DAY);
    const late = await run();
    expect(dayInEpoch(day0 + 3 * DAY)).toBe(1);
    expect(late.body.reevaluated).toBe(true);
    expect(late.body.planSnapshot.epoch).toBeGreaterThan(first.body.planSnapshot.epoch);
    expect(db.tables.cron_runs).toHaveLength(2);
  });
});

describe("rotate-deals: what readers see", () => {
  it("keeps the most-opened products first and changes the rest from one day to the next", async () => {
    const day0 = periodStart("2026-11-10T06:00:00Z");
    setUp(day0);

    vi.setSystemTime(day0);
    const a = await run();
    vi.setSystemTime(day0 + DAY);
    const b = await run();

    const topA = a.body.top as string[];
    const topB = b.body.top as string[];
    expect(topA.slice(0, 2)).toEqual(["AI Hardware product 0", "AI Hardware product 1"]);
    expect(topB.slice(0, 2)).toEqual(topA.slice(0, 2));
    expect(topB.slice(2)).not.toEqual(topA.slice(2));
    expect(b.body.newSinceLastRun).toBeGreaterThan(0);
  });

  it("DEALS_ROTATION=off brings back the plain order by activity", async () => {
    process.env.DEALS_ROTATION = "off";
    const day0 = periodStart("2026-11-10T06:00:00Z");
    setUp(day0);
    vi.setSystemTime(day0);
    const a = await run();
    vi.setSystemTime(day0 + DAY);
    const b = await run();
    expect(a.body.rotationEnabled).toBe(false);
    expect(b.body.top).toEqual(a.body.top);
  });
});

describe("rotate-deals: dry run", () => {
  it("builds and reports everything but changes nothing", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start);
    const { status, body } = await run("/api/cron/rotate-deals?dryRun=1");
    expect(status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.planSnapshot.epoch).toBe(reevalEpoch(start));
    expect(body.top.length).toBeGreaterThan(0);
    expect(db.writes).toEqual([]);
    expect(h.revalidateTag).not.toHaveBeenCalled();
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not save a snapshot, so discovery never reads one from a test run", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start);
    await run("/api/cron/rotate-deals?dryRun=1");
    expect(db.tables.cron_runs).toHaveLength(0);
  });
});

describe("rotate-deals: failures", () => {
  it("an unreadable database is a failed run that leaves the Deals cache exactly as it was", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start, { failOn: { affiliate_products: "connection reset" } });
    const { status, body } = await run();
    expect(status).toBe(500);
    expect(body.error).toMatch(/Database unavailable/);
    expect(db.tables.cron_runs).toHaveLength(1);
    expect(db.tables.cron_runs[0]).toMatchObject({ job: "rotate-deals", ok: false });
    // Clearing the cache with nothing to rebuild it from would blank the Deals pages.
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("an empty catalog is a failed run: logged, reported, and the empty answer is evicted", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    const db = setUp(start);
    db.tables.affiliate_products = [];
    const { status, body } = await run();
    expect(status).toBe(500);
    expect(body.error).toMatch(/came back empty/);
    expect(db.tables.cron_runs[0]).toMatchObject({ job: "rotate-deals", ok: false });
    // Cleared once before the rebuild and once more to evict the empty result.
    expect(h.revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("a failed run saves no snapshot, so discovery keeps using the last good one", async () => {
    const day0 = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(day0);
    const db = setUp(day0);
    const good = await run();
    expect(good.status).toBe(200);
    db.tables.affiliate_products = [];
    vi.setSystemTime(day0 + 2 * DAY);
    const bad = await run();
    expect(bad.status).toBe(500);
    const okRows = db.tables.cron_runs.filter((r) => r.ok === true);
    expect(okRows).toHaveLength(1);
  });

  it("an unreadable log table does not stop the rotation (it just cannot say what changed)", async () => {
    const start = periodStart("2026-11-10T06:00:00Z");
    vi.setSystemTime(start);
    setUp(start, { failOn: { cron_runs: "connection reset" } });
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.newSinceLastRun).toBeNull();
  });
});
