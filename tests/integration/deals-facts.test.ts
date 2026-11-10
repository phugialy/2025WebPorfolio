import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../support/fake-supabase";

const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/articles", () => ({ getGuideSummaries: async () => [] }));

import { getDealsData } from "@/lib/deals";

const DAY = 86_400_000;
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

function product(id: string, name: string, category: string) {
  return {
    id,
    name,
    category,
    image_url: "https://example.com/p.jpg",
    description: null,
    buy_if: null,
    skip_if: null,
    is_partner: false,
    flag_reason: null,
    network: "amazon",
    affiliate_url: `https://www.amazon.com/dp/B0${id.slice(-3)}`,
    promo_code: null,
    promo_details: null,
    brand: null,
    status: "active",
    created_at: new Date(Date.now() - 90 * DAY).toISOString(),
  };
}

function findAll(data: Awaited<ReturnType<typeof getDealsData>>) {
  const all = [...data.top, ...Object.values(data.holidays).flat(), ...data.sections.flatMap((s) => s.products)];
  return (id: string) => all.find((p) => p.id === id);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

describe("Deals loader: product card facts", () => {
  it("attaches facts from deals_product_facts to the right products", async () => {
    h.client = createFakeSupabase({
      tables: {
        affiliate_products: [product(A, "Curved Monitor", "Monitors"), product(B, "Mini PC", "AI Hardware")],
        affiliate_clicks: [],
        deals_catalog: [],
        deals_product_facts: [
          { product_id: A, what_it_is: "34-inch curved ultrawide", strengths: ["Strong contrast"], caveats: ["Dark smearing"], verdict: "recommended_with_caveats", confidence: "medium", evidence_count: 2, evidence_newest: "2025-12-15" },
        ],
      },
    });
    const find = findAll(await getDealsData());
    expect(find(A)?.facts).toMatchObject({ whatItIs: "34-inch curved ultrawide", strengths: ["Strong contrast"], verdict: "recommended_with_caveats", evidenceCount: 2 });
    expect(find(B)?.facts).toBeNull();
  });

  it("still shows every product when the facts table does not exist yet", async () => {
    h.client = createFakeSupabase({
      tables: {
        affiliate_products: [product(A, "Curved Monitor", "Monitors"), product(B, "Mini PC", "AI Hardware")],
        affiliate_clicks: [],
        deals_catalog: [],
        deals_product_facts: [],
      },
      failOn: { deals_product_facts: 'relation "deals_product_facts" does not exist' },
    });
    const data = await getDealsData();
    const find = findAll(data);
    expect(find(A)).toBeDefined();
    expect(find(B)).toBeDefined();
    expect(find(A)?.facts).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("deals_product_facts unavailable"), expect.any(String));
  });

  it("never selects a column the table does not have", async () => {
    // Guards the select list in lib/deals.ts against drifting from migration 0024.
    h.client = createFakeSupabase({
      tables: { affiliate_products: [product(A, "Curved Monitor", "Monitors")], affiliate_clicks: [], deals_catalog: [], deals_product_facts: [] },
      columns: {
        deals_product_facts: [
          "product_id", "what_it_is", "best_for", "buy_if", "skip_if", "strengths", "caveats", "key_specs", "price_class",
          "verdict", "confidence", "evidence_count", "evidence_newest", "verified_at", "guide_slug", "created_at", "updated_at",
        ],
      },
    });
    await getDealsData();
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining("deals_product_facts unavailable"), expect.anything());
  });
});
