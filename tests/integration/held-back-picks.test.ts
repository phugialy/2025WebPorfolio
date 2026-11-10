import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";
import { DEALS_HIDES } from "@/lib/deals-core";

const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));

import { isHeldBack, matchAffiliateProducts, matchProductsForArticle } from "@/lib/affiliate";

const HIDDEN = DEALS_HIDES[1]; // a product held back after the research pass
const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function product(id: string, name: string) {
  return { id, name, brand: null, category: "AI Hardware", tags: ["AI Hardware", "mini pc"], status: "active", is_partner: false };
}

function setUp(): FakeSupabase {
  const db = createFakeSupabase({
    tables: {
      articles: [{ id: ARTICLE, title: "Mini PCs for local AI", tags: ["mini pc", "AI Hardware"], portfolio_lane: null, status: "published", published_at: "2026-11-09T00:00:00Z", created_at: "2026-11-06T00:00:00Z" }],
      affiliate_products: [product(HIDDEN, "Held-back mini PC"), product("00000000-0000-4000-8000-0000000000f1", "Shown mini PC")],
      article_affiliate_products: [],
      affiliate_clicks: [],
    },
  });
  h.client = db;
  return db;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const matchedIds = (db: FakeSupabase) =>
  db.writes.filter((w) => w.table === "article_affiliate_products").flatMap((w) => (Array.isArray(w.payload) ? w.payload : [w.payload]) as { product_id: string }[]).map((r) => r.product_id);

describe("held-back products stay out of automatic picks", () => {
  it("recognises a product the owner held back", () => {
    expect(isHeldBack({ id: HIDDEN })).toBe(true);
    expect(isHeldBack({ id: "00000000-0000-4000-8000-0000000000f1" })).toBe(false);
  });

  it("the per-article matcher never attaches it, even when it scores as well as any other", async () => {
    const db = setUp();
    await matchProductsForArticle(ARTICLE);
    const ids = matchedIds(db);
    expect(ids).toContain("00000000-0000-4000-8000-0000000000f1");
    expect(ids).not.toContain(HIDDEN);
  });

  it("the backlog matcher never attaches it either", async () => {
    const db = setUp();
    await matchAffiliateProducts();
    expect(matchedIds(db)).not.toContain(HIDDEN);
  });
});
