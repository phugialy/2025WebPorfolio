import { describe, expect, it } from "vitest";
import {
  DEALS_ENDS_AT,
  DEALS_STARTS_AT,
  HOLIDAYS,
  SECTIONS,
  activeDeals,
  applyCategoryOverrides,
  buildItemListJsonLd,
  buildSections,
  daysUntil,
  filterExplorer,
  getHoliday,
  goHref,
  hasProductImage,
  holidayTop,
  isDealsActive,
  isEligible,
  scoreProducts,
  sectionSlugFor,
  toExplorerItems,
  topOverall,
  type ClickRow,
  type Deal,
  type DealsProduct,
} from "./deals-core";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function product(id: string, category: string | null, extra: Partial<DealsProduct> = {}): DealsProduct {
  return {
    id,
    name: `Product ${id}`,
    category,
    image_url: null,
    description: null,
    buy_if: null,
    is_partner: false,
    flag_reason: null,
    ...extra,
  };
}

const click = (productId: string, daysAgo: number, ua = "ua-1"): ClickRow => ({
  product_id: productId,
  user_agent: ua,
  created_at: new Date(NOW - daysAgo * DAY).toISOString(),
});

describe("season window", () => {
  it("is active during the season and off before and after", () => {
    expect(isDealsActive(DEALS_STARTS_AT - 1)).toBe(false);
    expect(isDealsActive(DEALS_STARTS_AT)).toBe(true);
    expect(isDealsActive(Date.parse("2026-11-27T00:00:00Z"))).toBe(true);
    expect(isDealsActive(DEALS_ENDS_AT - 1)).toBe(true);
    expect(isDealsActive(DEALS_ENDS_AT)).toBe(false);
  });
  it("counts days until a holiday", () => {
    expect(daysUntil("2026-11-27", Date.parse("2026-11-20T00:00:00Z"))).toBe(7);
    expect(daysUntil("2026-11-27", Date.parse("2026-11-28T00:00:00Z"))).toBe(-1);
  });
});

describe("eligibility", () => {
  it("excludes partners, products under review, and hand-hidden products", () => {
    expect(isEligible(product("a", "AI Hardware"))).toBe(true);
    expect(isEligible(product("b", "Energy & Utilities", { is_partner: true }))).toBe(false);
    expect(isEligible(product("c", "Keyboards", { flag_reason: "Pending review" }))).toBe(false);
    expect(isEligible(product("d", "Monitors"), ["d"])).toBe(false);
  });
});

describe("scoring", () => {
  const products = [product("a", "AI Hardware"), product("b", "Keyboards"), product("c", "Monitors")];

  it("counts distinct browser-days, not raw clicks", () => {
    const clicks = [click("a", 1, "same"), click("a", 1, "same"), click("a", 1, "same"), click("a", 2, "same"), click("a", 1, "other")];
    expect(scoreProducts(products, clicks, NOW).find((p) => p.id === "a")!.score).toBe(3);
  });

  it("uses the last 7 days as current and the 7 before as prior, and ignores older and future clicks", () => {
    const scored = scoreProducts(products, [click("b", 3, "x"), click("b", 10, "y"), click("b", 20, "z"), click("b", -1, "f")], NOW);
    const b = scored.find((p) => p.id === "b")!;
    expect(b.score).toBe(1);
    expect(b.previous).toBe(1);
  });

  it("marks rising only with enough activity and clear growth", () => {
    const up = [click("a", 1, "1"), click("a", 2, "2"), click("a", 3, "3"), click("a", 9, "4")];
    expect(scoreProducts(products, up, NOW).find((p) => p.id === "a")!.rising).toBe(true);
    const flat = [click("b", 1, "1"), click("b", 9, "2"), click("b", 10, "3")];
    expect(scoreProducts(products, flat, NOW).find((p) => p.id === "b")!.rising).toBe(false);
    expect(scoreProducts(products, [click("c", 1, "1")], NOW).find((p) => p.id === "c")!.rising).toBe(false);
  });

  it("ignores clicks with no product or a bad date", () => {
    const scored = scoreProducts(
      products,
      [
        { product_id: null, user_agent: "x", created_at: new Date(NOW - DAY).toISOString() },
        { product_id: "a", user_agent: "x", created_at: "not a date" },
      ],
      NOW
    );
    expect(scored.every((p) => p.score === 0)).toBe(true);
  });
});

describe("topOverall", () => {
  const products = ["a", "b", "c", "d"].map((id) => product(id, "AI Hardware"));
  const scored = scoreProducts(products, [click("c", 1, "1"), click("c", 2, "2"), click("b", 1, "3")], NOW);
  it("orders by recent activity and respects the limit", () => {
    expect(topOverall(scored, 2, []).map((p) => p.id)).toEqual(["c", "b"]);
  });
  it("puts pinned products first without duplicating them", () => {
    expect(topOverall(scored, 4, ["d", "c"]).map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
  });
  it("ignores an unknown pin and still fills when nothing has activity", () => {
    expect(topOverall(scored, 2, ["zzz"]).map((p) => p.id)).toEqual(["c", "b"]);
    expect(topOverall(scoreProducts(products, [], NOW), 3, [])).toHaveLength(3);
  });
});

describe("holiday lists (Top N for a holiday)", () => {
  // 3 hardware, 3 monitors, 3 keyboards, 3 books, 3 gadgets
  const catalog = [
    ...["h1", "h2", "h3"].map((id) => product(id, "AI Hardware")),
    ...["m1", "m2", "m3"].map((id) => product(id, "Monitors")),
    ...["k1", "k2", "k3"].map((id) => product(id, "Keyboards")),
    ...["b1", "b2", "b3"].map((id) => product(id, "Books")),
    ...["e1", "e2", "e3"].map((id) => product(id, "Everyday Carry")),
  ];
  const clicks = [
    ...Array.from({ length: 9 }, (_, i) => click("h1", 1, `a${i}`)),
    ...Array.from({ length: 7 }, (_, i) => click("b1", 1, `b${i}`)),
    ...Array.from({ length: 5 }, (_, i) => click("m1", 1, `c${i}`)),
  ];
  const scored = scoreProducts(catalog, clicks, NOW);

  it("every holiday has a unique slug, a title and description for search, and valid sections", () => {
    const slugs = HOLIDAYS.map((h) => h.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const valid = new Set(SECTIONS.map((s) => s.slug));
    for (const h of HOLIDAYS) {
      expect(h.seoTitle.length).toBeGreaterThan(20);
      expect(h.seoTitle.length).toBeLessThanOrEqual(75);
      expect(h.seoDescription.length).toBeGreaterThan(80);
      expect(h.seoDescription.length).toBeLessThanOrEqual(200);
      expect(h.sections.every((s) => valid.has(s))).toBe(true);
    }
    expect(getHoliday("black-friday")?.name).toBe("Black Friday");
    expect(getHoliday("nope")).toBeUndefined();
  });

  it("only draws from the holiday's sections and ranks by activity", () => {
    const bf = getHoliday("black-friday")!; // hardware, monitors, keyboards, desk
    const list = holidayTop(bf, scored, 10, []);
    expect(list.every((p) => bf.sections.includes(sectionSlugFor(p.category)))).toBe(true);
    expect(list.map((p) => p.id)).not.toContain("b1"); // books are not in Black Friday
    expect(list[0].id).toBe("h1");
  });

  it("keeps the list varied: no section takes more than its share", () => {
    const bf = getHoliday("black-friday")!;
    const list = holidayTop(bf, scored, 6, []);
    const counts = new Map<string, number>();
    list.forEach((p) => counts.set(sectionSlugFor(p.category), (counts.get(sectionSlugFor(p.category)) ?? 0) + 1));
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it("returns fewer than N rather than padding with out-of-scope items", () => {
    const tiny = scoreProducts([product("only", "Monitors")], [], NOW);
    expect(holidayTop(getHoliday("black-friday")!, tiny, 10, [])).toHaveLength(1);
  });

  it("puts pins that belong to the holiday first, and ignores pins that do not", () => {
    const bf = getHoliday("black-friday")!;
    const list = holidayTop(bf, scored, 10, ["k3", "b1"]);
    expect(list[0].id).toBe("k3");
    expect(list.map((p) => p.id)).not.toContain("b1");
  });

  it("the Christmas list can include books", () => {
    const xmas = getHoliday("christmas-gifts")!;
    expect(holidayTop(xmas, scored, 10, []).map((p) => p.id)).toContain("b1");
  });
});

describe("hub sections", () => {
  const products = [
    product("h1", "AI Hardware"),
    product("h2", "AI Hardware"),
    product("b1", "Books"),
    product("k1", "Keyboards"),
    product("x1", "Totally New Category"),
    product("n1", null),
  ];
  it("groups categories into shopping sections and puts unknown ones under More picks", () => {
    const bySlug = Object.fromEntries(buildSections(scoreProducts(products, [], NOW)).map((s) => [s.slug, s]));
    expect(bySlug["ai-computing"].products.map((p) => p.id).sort()).toEqual(["h1", "h2"]);
    expect(bySlug["more"].products.map((p) => p.id).sort()).toEqual(["n1", "x1"]);
  });
  it("sorts sections by activity and omits empty ones", () => {
    const clicks = [click("k1", 1, "1"), click("k1", 2, "2"), click("h1", 1, "3")];
    const sections = buildSections(scoreProducts(products, clicks, NOW));
    expect(sections[0].slug).toBe("keyboards-input");
    expect(sections.find((s) => s.slug === "monitors")).toBeUndefined();
  });
  it("does not repeat items already shown above unless a section would be empty", () => {
    const many = Array.from({ length: 6 }, (_, i) => product(`m${i}`, "Monitors"));
    const ids = buildSections(scoreProducts(many, [], NOW), 4, new Set(["m0", "m1"]))[0].products.map((p) => p.id);
    expect(ids).toHaveLength(4);
    expect(ids).not.toContain("m0");
    const only = buildSections(scoreProducts([product("only", "Monitors")], [], NOW), 4, new Set(["only"]));
    expect(only[0].products.map((p) => p.id)).toEqual(["only"]);
  });
  it("maps every category the catalog currently uses, so nothing silently lands in More picks", () => {
    const used = [
      "AI Hardware", "Keyboards", "Input Devices", "Monitors", "AI Engineering", "Webcams", "Audio",
      "Docking & Hubs", "Books", "Machine Learning (Books)", "Desk Setup", "AI (Books)", "LLMs (Books)",
      "Creative Tools", "AI Safety (Books)", "Storage", "Cables & Chargers", "Open Source (Books)",
      "AI Research (Books)", "AI Security (Books)", "Cybersecurity (Books)", "Software Engineering (Books)",
      "Agentic AI (Books)", "AI Engineering (Books)", "Cleaning & Care", "Wellness & Ergonomics", "Everyday Carry",
    ];
    expect(used.filter((c) => sectionSlugFor(c) === "more")).toEqual([]);
  });
});

describe("product explorer", () => {
  const items = toExplorerItems(
    scoreProducts(
      [
        product("1", "AI Hardware", { name: "GMKtec Mini PC", buy_if: "you want to run local models" }),
        product("2", "Keyboards", { name: "Mechanical Keyboard" }),
        product("3", "Monitors", { name: "UltraWide Monitor", buy_if: "you code all day" }),
      ],
      [click("2", 1, "1"), click("2", 2, "2")],
      NOW
    )
  );

  it("returns everything with no filters, trending first", () => {
    const all = filterExplorer(items, {});
    expect(all).toHaveLength(3);
    expect(all[0].id).toBe("2");
  });
  it("searches names, categories and the buy-if line, with every word required", () => {
    expect(filterExplorer(items, { query: "mini pc" }).map((i) => i.id)).toEqual(["1"]);
    expect(filterExplorer(items, { query: "keyboards" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterExplorer(items, { query: "code all" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterExplorer(items, { query: "mini monitor" })).toEqual([]);
    expect(filterExplorer(items, { query: "  MINI   " }).map((i) => i.id)).toEqual(["1"]);
  });
  it("filters by section and sorts by name on request", () => {
    expect(filterExplorer(items, { section: "monitors" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterExplorer(items, { section: "all" })).toHaveLength(3);
    expect(filterExplorer(items, { sort: "name" }).map((i) => i.name)).toEqual([
      "GMKtec Mini PC",
      "Mechanical Keyboard",
      "UltraWide Monitor",
    ]);
  });
  it("combines search and section", () => {
    expect(filterExplorer(items, { query: "pc", section: "monitors" })).toEqual([]);
  });
});

describe("links and structured data", () => {
  it("builds a tracked redirect link with a per-section ref", () => {
    expect(goHref("abc", "black-friday")).toBe("/api/affiliate/go/abc?ref=deals-black-friday");
  });
  it("builds an ItemList with positions and on-page anchors", () => {
    const json = buildItemListJsonLd({
      name: "Top 10",
      url: "https://www.phugialy.com/deals/black-friday",
      items: [
        { name: "A", anchor: "p-a" },
        { name: "B", anchor: "p-b" },
      ],
    });
    expect(json["@type"]).toBe("ItemList");
    expect(json.numberOfItems).toBe(2);
    expect(json.itemListElement[1]).toMatchObject({ position: 2, name: "B", url: "https://www.phugialy.com/deals/black-friday#p-b" });
  });
});

describe("deals", () => {
  const mk = (extra: Partial<Deal>): Deal => ({ id: "d", merchant: "M", title: "T", description: "D", url: "https://x.test", ...extra });
  it("keeps live deals, hides future and expired ones, featured first", () => {
    const deals = [
      mk({ id: "live" }),
      mk({ id: "future", validFrom: "2026-11-20" }),
      mk({ id: "expired", validTo: "2026-11-05" }),
      mk({ id: "today", validTo: "2026-11-10", featured: true }),
    ];
    expect(activeDeals(deals, NOW).map((d) => d.id)).toEqual(["today", "live"]);
  });
  it("a deal stays visible through the whole of its last day", () => {
    const d = [mk({ id: "x", validTo: "2026-11-10" })];
    expect(activeDeals(d, Date.parse("2026-11-10T23:59:00Z"))).toHaveLength(1);
    expect(activeDeals(d, Date.parse("2026-11-11T00:00:01Z"))).toHaveLength(0);
  });
});

describe("category overrides", () => {
  it("moves a mis-filed product to the right category for these pages only", () => {
    const list = [
      { id: "26056ab1-9d30-41ed-ae7e-e44f147ef860", category: "AI Hardware" as string | null },
      { id: "other", category: "AI Hardware" as string | null },
    ];
    const out = applyCategoryOverrides(list);
    expect(out[0].category).toBe("Books");
    expect(out[1].category).toBe("AI Hardware");
    expect(list[0].category).toBe("AI Hardware"); // input is not changed
  });
  it("a book that was filed under hardware no longer appears in the Black Friday list", () => {
    const fixed = applyCategoryOverrides([
      { ...product("26056ab1-9d30-41ed-ae7e-e44f147ef860", "AI Hardware"), name: "A book" },
      product("real", "AI Hardware"),
    ]);
    const list = holidayTop(getHoliday("black-friday")!, scoreProducts(fixed, [], NOW), 10, []);
    expect(list.map((p) => p.id)).toEqual(["real"]);
  });
  it("hand-hidden duplicates are never eligible", () => {
    expect(isEligible(product("cb5793d4-53a7-4952-b618-24d3abcc1393", "AI Engineering"))).toBe(false);
  });
});

describe("product images", () => {
  it("treats Amazon's placeholder logo and empty values as no image", () => {
    expect(hasProductImage("https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png")).toBe(false);
    expect(hasProductImage("")).toBe(false);
    expect(hasProductImage(null)).toBe(false);
    expect(hasProductImage(undefined)).toBe(false);
  });
  it("accepts a real product image", () => {
    expect(hasProductImage("https://m.media-amazon.com/images/I/71abcDEF.jpg")).toBe(true);
  });
});
