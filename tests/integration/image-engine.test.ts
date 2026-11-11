import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";

const h = vi.hoisted(() => ({ client: null as unknown, revalidateTag: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));
vi.mock("next/cache", () => ({ revalidateTag: h.revalidateTag, revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { runImageEngine, verifyImageUrl, weeklyBucket } from "@/lib/image-engine";
import { GET } from "@/app/api/cron/product-images/route";

const PLACEHOLDER = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";
const NOW = Date.parse("2026-11-11T07:00:00Z"); // a Wednesday
const good = (n: number) => `https://m.media-amazon.com/images/I/good${n}.jpg`;

// Network stand-in: Amazon product pages by ASIN, and image files by address.
type Net = { pages: Record<string, string>; images: Record<string, { status?: number; type?: string; bytes?: number }>; fetched: string[]; onPage?: (asin: string) => void };
function stubNetwork(net: Net) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      net.fetched.push(url);
      const asin = /\/dp\/([A-Z0-9]{10})/.exec(url)?.[1];
      if (asin) {
        net.onPage?.(asin);
        const html = net.pages[asin];
        return html === undefined ? new Response("", { status: 503 }) : new Response(html, { status: 200 });
      }
      const image = net.images[url];
      if (!image) return new Response("", { status: 404 });
      return new Response(new Uint8Array(image.bytes ?? 50_000), { status: image.status ?? 200, headers: { "content-type": image.type ?? "image/jpeg" } });
    })
  );
}
const page = (title: string, image: string, extra = "") =>
  `<html><head><meta property="og:title" content="${title}"><meta property="og:image" content="${image}"></head><body>${extra}</body></html>`;

let net: Net;
function product(n: number, image: string | null, extra: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name: `Product ${n}`,
    image_url: image,
    affiliate_url: `https://www.amazon.com/dp/B0TEST${String(n).padStart(4, "0")}`,
    status: "active",
    is_partner: false,
    ...extra,
  };
}
const asin = (n: number) => `B0TEST${String(n).padStart(4, "0")}`;
function setUp(products: Record<string, unknown>[]): FakeSupabase {
  const db = createFakeSupabase({ tables: { affiliate_products: products, cron_runs: [] } });
  h.client = db;
  return db;
}
const run = (db: FakeSupabase, options: Parameters<typeof runImageEngine>[1] = {}) =>
  runImageEngine(db as never, { now: NOW, delayMs: 0, sleep: async () => {}, ...options });
const logOf = (db: FakeSupabase) => ((db.writes.find((w) => w.table === "cron_runs")!.payload as unknown[]).flat()[0] as { job: string; ok: boolean });
const imageOf = (db: FakeSupabase, n: number) => (db.tables.affiliate_products.find((r) => r.id === product(n, null).id) as { image_url: string }).image_url;

beforeEach(() => {
  net = { pages: {}, images: {}, fetched: [] };
  stubNetwork(net);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("picture engine: repairing missing and placeholder pictures", () => {
  it("replaces a placeholder with the product's real picture, checked to be a real image", async () => {
    net.pages[asin(1)] = page("Power Bank", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, PLACEHOLDER)]);
    const result = await run(db);
    expect(result.repaired).toEqual([{ id: product(1, null).id, name: "Product 1", before: PLACEHOLDER, after: good(1) }]);
    expect(imageOf(db, 1)).toBe(good(1));
    expect(result.leftOver).toBe(0);
  });

  it("uses the product's main picture from the page when the preview image is Amazon's logo", async () => {
    net.pages[asin(1)] = page("Cable", PLACEHOLDER, `<script>{"hiRes":"${good(9)}"}</script>`);
    net.images[good(9)] = {};
    const db = setUp([product(1, null)]);
    expect((await run(db)).repaired[0].after).toBe(good(9));
    expect(imageOf(db, 1)).toBe(good(9));
  });

  it("never touches a good picture and does not even load its product page", async () => {
    net.images[good(2)] = {};
    const db = setUp([product(2, good(2))]);
    // Pick a "now" whose weekday bucket does not include this product, so no spot-check runs either.
    const day = [0, 1, 2, 3, 4, 5, 6].find((d) => !weeklyBucket(product(2, null).id, Date.UTC(2026, 10, 8 + d)))!;
    const result = await run(db, { now: Date.UTC(2026, 10, 8 + day, 7) });
    expect(result.repaired).toEqual([]);
    expect(imageOf(db, 2)).toBe(good(2));
    expect(net.fetched.some((u) => u.includes("/dp/"))).toBe(false);
    expect(db.writes).toEqual([]);
  });

  it("rejects a picture that is really a tiny placeholder or not an image, and saves nothing", async () => {
    net.pages[asin(1)] = page("A", good(1));
    net.pages[asin(2)] = page("B", good(2));
    net.images[good(1)] = { bytes: 43 }; // a 1x1 gif
    net.images[good(2)] = { type: "text/html" };
    const db = setUp([product(1, PLACEHOLDER), product(2, null)]);
    const result = await run(db);
    expect(result.repaired).toEqual([]);
    expect(result.failed.map((f) => f.reason).join(" | ")).toMatch(/too small.*not an image/);
    expect(db.writes).toEqual([]);
  });

  it("skips partner placements and products without a link", async () => {
    const db = setUp([product(1, null, { is_partner: true }), product(2, null, { affiliate_url: "" })]);
    const result = await run(db);
    expect(result.scanned).toBe(0);
    expect(net.fetched).toEqual([]);
  });

  it("repairs at most maxRepairs products per run and reports the rest as left over", async () => {
    for (let n = 1; n <= 4; n += 1) {
      net.pages[asin(n)] = page(`P${n}`, good(n));
      net.images[good(n)] = {};
    }
    const db = setUp([1, 2, 3, 4].map((n) => product(n, PLACEHOLDER)));
    const result = await run(db, { maxRepairs: 2 });
    expect(result.repaired).toHaveLength(2);
    expect(result.leftOver).toBe(2);
  });

  it("stops after two challenged pages in a row instead of hammering Amazon", async () => {
    net.pages[asin(1)] = "<html><body>Robot Check</body></html>";
    net.pages[asin(2)] = "<html><body>Robot Check</body></html>";
    net.pages[asin(3)] = page("C", good(3));
    net.images[good(3)] = {};
    const db = setUp([1, 2, 3].map((n) => product(n, PLACEHOLDER)));
    const result = await run(db);
    expect(result.blocked).toBe(true);
    expect(result.repaired).toEqual([]);
    expect(net.fetched.filter((u) => u.includes("/dp/"))).toHaveLength(2);
    expect(result.leftOver).toBe(3);
  });
});

describe("picture engine: weekly spot-check of existing pictures", () => {
  it("only checks today's share, and repairs a picture that no longer loads", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    const today = ids.filter((n) => weeklyBucket(product(n, null).id, NOW));
    const other = ids.filter((n) => !weeklyBucket(product(n, null).id, NOW));
    expect(today.length).toBeGreaterThan(0);
    expect(other.length).toBeGreaterThan(0);
    const broken = today[0];
    for (const n of ids) net.images[good(n)] = {};
    delete net.images[good(broken)]; // 404 now
    net.pages[asin(broken)] = page("Fresh", good(100));
    net.images[good(100)] = {};
    const db = setUp(ids.map((n) => product(n, good(n))));
    const result = await run(db);
    expect(result.checked).toBe(today.length);
    expect(result.broken.map((b) => b.name)).toEqual([`Product ${broken}`]);
    expect(imageOf(db, broken)).toBe(good(100));
    // Healthy pictures stayed as they were.
    expect(imageOf(db, today[1] ?? today[0])).toBe(today.length > 1 ? good(today[1]) : good(100));
    expect(imageOf(db, other[0])).toBe(good(other[0]));
  });
});

describe("picture engine: dry run", () => {
  it("does the real fetches and checks but saves nothing", async () => {
    net.pages[asin(1)] = page("P", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, PLACEHOLDER)]);
    const result = await run(db, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.repaired).toHaveLength(1);
    expect(imageOf(db, 1)).toBe(PLACEHOLDER);
    expect(db.writes).toEqual([]);
  });
});

describe("verifyImageUrl", () => {
  it("accepts a real image and rejects errors, non-images, tiny files and non-https", async () => {
    net.images[good(1)] = {};
    net.images[good(2)] = { status: 403 };
    net.images[good(3)] = { type: "text/html" };
    net.images[good(4)] = { bytes: 100 };
    expect((await verifyImageUrl(good(1))).ok).toBe(true);
    expect((await verifyImageUrl(good(2))).reason).toMatch(/403/);
    expect((await verifyImageUrl(good(3))).reason).toMatch(/not an image/);
    expect((await verifyImageUrl(good(4))).reason).toMatch(/too small/);
    expect((await verifyImageUrl("http://x.example/a.jpg")).ok).toBe(false);
  });
});

describe("picture engine: safety in production", () => {
  it("does not overwrite a picture an admin set while the engine was working", async () => {
    net.pages[asin(1)] = page("P", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, PLACEHOLDER)]);
    // While the engine is fetching the page, an admin saves a picture by hand.
    net.onPage = () => {
      (db.tables.affiliate_products[0] as { image_url: string }).image_url = good(77);
    };
    const result = await run(db);
    expect(result.repaired).toEqual([]);
    expect(result.failed[0].reason).toMatch(/changed while the engine was working/);
    expect(imageOf(db, 1)).toBe(good(77));
  });

  it("also guards a product that had no picture at all", async () => {
    net.pages[asin(1)] = page("P", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, null)]);
    net.onPage = () => {
      (db.tables.affiliate_products[0] as { image_url: string | null }).image_url = good(88);
    };
    const result = await run(db);
    expect(result.repaired).toEqual([]);
    expect(imageOf(db, 1)).toBe(good(88));
  });

  it("refuses a picture address that points at a private or non-https place, without fetching it", async () => {
    net.pages[asin(1)] = page("P", "https://169.254.169.254/latest/meta-data/x.jpg");
    net.pages[asin(2)] = page("Q", "http://m.media-amazon.com/images/I/plain-http.jpg");
    const db = setUp([product(1, PLACEHOLDER), product(2, null)]);
    const result = await run(db);
    expect(result.repaired).toEqual([]);
    expect(result.failed.map((f) => f.reason).join(" | ")).toMatch(/not a public https address/);
    expect(net.fetched.some((u) => u.includes("169.254"))).toBe(false);
    expect(db.writes).toEqual([]);
  });

  it("stops starting new work once its time budget is spent and says so", async () => {
    for (let n = 1; n <= 3; n += 1) {
      net.pages[asin(n)] = page(`P${n}`, good(n));
      net.images[good(n)] = {};
    }
    const db = setUp([1, 2, 3].map((n) => product(n, PLACEHOLDER)));
    const result = await run(db, { budgetMs: -1 });
    expect(result.timedOut).toBe(true);
    expect(result.repaired).toEqual([]);
    expect(result.leftOver).toBe(3);
  });

  it("spreads products across all seven weekdays", () => {
    const ids = Array.from({ length: 70 }, (_, i) => product(i + 1, null).id);
    const counts = [0, 1, 2, 3, 4, 5, 6].map((d) => ids.filter((id) => weeklyBucket(id, Date.UTC(2026, 10, 8 + d))).length);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(70); // each product has exactly one day
    expect(Math.min(...counts)).toBeGreaterThan(3); // and no weekday is starved or flooded
    expect(Math.max(...counts)).toBeLessThan(20);
  });
});

describe("deals ranking feed", () => {
  it("marks trending only for products that carry the strict badge", async () => {
    const { GET: ranking } = await import("@/app/api/deals/ranking/route");
    const rows = [product(1, good(1)), product(2, good(2))].map((p) => ({ ...p, category: "Monitors", description: null, buy_if: null, flag_reason: null, created_at: "2025-01-01T00:00:00Z", network: "amazon", promo_code: null, promo_details: null, brand: null }));
    h.client = createFakeSupabase({ tables: { affiliate_products: rows, affiliate_clicks: [], deals_catalog: [], deals_product_facts: [] } });
    const body = (await (await ranking()).json()) as { trending: { id: string; trending: boolean }[] };
    // No clicks at all: nothing may be labeled trending, whatever the old loose flag would say.
    expect(body.trending.every((t) => t.trending === false)).toBe(true);
  });
});

describe("product-images cron route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s";
    h.revalidateTag.mockClear();
  });
  const call = (path = "/api/cron/product-images", secret: string | null = "s") =>
    GET(new NextRequest(`http://localhost${path}`, { headers: secret ? { authorization: `Bearer ${secret}` } : {} }));

  it("refuses a request without the secret and does nothing", async () => {
    const db = setUp([product(1, PLACEHOLDER)]);
    expect((await call("/api/cron/product-images", null)).status).toBe(401);
    expect(db.writes).toEqual([]);
  });

  it("repairs, clears the Deals cache and logs the run", async () => {
    net.pages[asin(1)] = page("P", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, PLACEHOLDER)]);
    const res = await call();
    const body = (await res.json()) as { ok: boolean; repaired: unknown[] };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(h.revalidateTag).toHaveBeenCalledWith("deals");
    expect(logOf(db)).toMatchObject({ job: "product-images", ok: true });
  });

  it("logs a failed run when pictures are missing and none can be repaired", async () => {
    net.pages[asin(1)] = "<html></html>";
    net.pages[asin(2)] = "<html></html>";
    const db = setUp([product(1, PLACEHOLDER), product(2, null)]);
    const body = (await (await call()).json()) as { ok: boolean; note?: string };
    expect(body.ok).toBe(false);
    expect(body.note).toMatch(/none could be repaired/);
    expect(logOf(db).ok).toBe(false);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("a dry run writes and logs nothing", async () => {
    net.pages[asin(1)] = page("P", good(1));
    net.images[good(1)] = {};
    const db = setUp([product(1, PLACEHOLDER)]);
    const body = (await (await call("/api/cron/product-images?dryRun=1")).json()) as { dryRun: boolean; repaired: unknown[] };
    expect(body.dryRun).toBe(true);
    expect(body.repaired).toHaveLength(1);
    expect(db.writes).toEqual([]);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });
});
