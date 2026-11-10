import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";

const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));

import { updateAffiliateProduct } from "@/lib/affiliate";

const product = (id: string, status: string, flag: string | null) => ({
  id,
  name: `Product ${id}`,
  network: "amazon",
  category: "Laptops",
  tags: ["Laptops"],
  status,
  flag_reason: flag,
  flagged_at: flag ? "2026-11-09T14:45:00Z" : null,
  brand: null,
});

function setUp(rows: Record<string, unknown>[]): FakeSupabase {
  const db = createFakeSupabase({ tables: { affiliate_products: rows, articles: [], article_affiliate_products: [] } });
  h.client = db;
  return db;
}
const row = (db: FakeSupabase, id: string) => db.tables.affiliate_products.find((r) => r.id === id)!;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("activating a product the discovery engine proposed", () => {
  it("clears the engine's flag, so the product reaches the Deals pages and the guide engine", async () => {
    const db = setUp([product("p1", "inactive", "market-scan proposal")]);
    await updateAffiliateProduct("p1", { status: "active" });
    expect(row(db, "p1")).toMatchObject({ status: "active", flag_reason: null, flagged_at: null });
  });

  it("leaves other flags alone (a compliance hold must survive activation)", async () => {
    const db = setUp([
      product("p2", "inactive", "Pending Ambit compliance approval"),
      product("p3", "inactive", "No clicks after 30 days"),
    ]);
    await updateAffiliateProduct("p2", { status: "active" });
    await updateAffiliateProduct("p3", { status: "active" });
    expect(row(db, "p2").flag_reason).toBe("Pending Ambit compliance approval");
    expect(row(db, "p3").flag_reason).toBe("No clicks after 30 days");
  });

  it("does not clear the flag on an edit that is not an activation", async () => {
    const db = setUp([product("p4", "inactive", "market-scan proposal")]);
    await updateAffiliateProduct("p4", { name: "Renamed" });
    expect(row(db, "p4")).toMatchObject({ name: "Renamed", flag_reason: "market-scan proposal", status: "inactive" });
  });

  it("does not clear it when the product is deactivated, or already active", async () => {
    const db = setUp([product("p5", "active", "market-scan proposal"), product("p6", "active", "market-scan proposal")]);
    await updateAffiliateProduct("p5", { status: "active" });
    await updateAffiliateProduct("p6", { status: "inactive" });
    expect(row(db, "p5").flag_reason).toBe("market-scan proposal");
    expect(row(db, "p6").flag_reason).toBe("market-scan proposal");
  });

  it("an explicit flag change in the same request wins over the automatic clear", async () => {
    const db = setUp([product("p7", "inactive", "market-scan proposal")]);
    await updateAffiliateProduct("p7", { status: "active", flagReason: "Held for review" });
    expect(row(db, "p7")).toMatchObject({ status: "active", flag_reason: "Held for review" });
  });

  it("dismissing a flag by hand still works", async () => {
    const db = setUp([product("p8", "active", "market-scan proposal")]);
    await updateAffiliateProduct("p8", { flagReason: null });
    expect(row(db, "p8")).toMatchObject({ flag_reason: null, flagged_at: null });
  });
});
