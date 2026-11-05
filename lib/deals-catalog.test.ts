import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_PAGES,
  CATALOG_PAGE_SIZE,
  CATALOG_TABS,
  HOLIDAYS,
  attachCatalog,
  buildSeries,
  defaultTagsFor,
  holidayTop,
  itemsForTab,
  nicheFromTags,
  normalizeTags,
  paginate,
  pinOrder,
  scoreProducts,
  visibleTabs,
  type CatalogRow,
  type DealsProduct,
  type ExplorerItem,
} from "./deals-core";

const product = (id: string, category: string | null, extra: Partial<DealsProduct> = {}): DealsProduct => ({
  id,
  name: `Product ${id}`,
  category,
  image_url: null,
  description: null,
  buy_if: null,
  is_partner: false,
  flag_reason: null,
  ...extra,
});

const item = (id: string, tags: string[], score = 0, extra: Partial<ExplorerItem> = {}): ExplorerItem => ({
  id,
  name: `Item ${id}`,
  category: null,
  section: "more",
  image_url: null,
  buy_if: null,
  score,
  rising: false,
  tags,
  pinned: null,
  ...extra,
});

describe("default tags from a category", () => {
  it("tags AI hardware as technology, AI and the tech holidays", () => {
    const tags = defaultTagsFor("AI Hardware");
    expect(tags).toEqual(expect.arrayContaining(["technology", "ai", "thanksgiving-week", "black-friday", "cyber-monday"]));
    expect(tags).not.toContain("books");
  });
  it("tags books as books and AI, but not technology", () => {
    const tags = defaultTagsFor("Machine Learning (Books)");
    expect(tags).toEqual(expect.arrayContaining(["books", "ai", "christmas-gifts"]));
    expect(tags).not.toContain("technology");
  });
  it("tags a book as AI only when its category or title is about AI", () => {
    expect(defaultTagsFor("Books", "The 30-Day Productivity Plan")).not.toContain("ai");
    expect(defaultTagsFor("Cybersecurity (Books)", "Cybersecurity Law")).not.toContain("ai");
    expect(defaultTagsFor("Books", "Master AI for Beginners")).toContain("ai");
    expect(defaultTagsFor("LLMs (Books)", "Build a Large Language Model")).toContain("ai");
    expect(defaultTagsFor("Books")).toContain("ai"); // no title given: keep the category default
  });
  it("does not call everyday items technology", () => {
    expect(defaultTagsFor("Everyday Carry")).not.toContain("technology");
    expect(defaultTagsFor("Cleaning & Care")).not.toContain("technology");
    expect(defaultTagsFor("Cables & Chargers")).toContain("technology");
  });
  it("tags keyboards for the desk tab", () => {
    expect(defaultTagsFor("Keyboards")).toContain("desk");
  });
  it("gives an unknown or missing category no tags", () => {
    expect(defaultTagsFor(null)).toEqual([]);
    expect(defaultTagsFor("Energy & Utilities")).toEqual([]);
  });
});

describe("joining the dedicated catalog onto products", () => {
  const products = [product("a", "AI Hardware"), product("b", "Keyboards"), product("c", "Monitors")];

  it("falls back to every product with category tags when there are no entries", () => {
    for (const rows of [null, undefined, []] as (CatalogRow[] | null | undefined)[]) {
      const result = attachCatalog(products, rows);
      expect(result.dedicated).toBe(false);
      expect(result.products.map((p) => p.id)).toEqual(["a", "b", "c"]);
      expect(result.products[0].tags).toContain("ai");
    }
  });

  it("keeps only products that have an entry, and uses the entry's tags", () => {
    const rows: CatalogRow[] = [{ product_id: "b", tags: ["Books", " christmas-gifts "], pinned_rank: 2, hidden: false }];
    const result = attachCatalog(products, rows);
    expect(result.dedicated).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({ id: "b", tags: ["books", "christmas-gifts"], pinned_rank: 2 });
  });

  it("drops hidden entries, and an entry with no tags gets the category defaults", () => {
    const rows: CatalogRow[] = [
      { product_id: "a", tags: [], pinned_rank: null, hidden: false },
      { product_id: "b", tags: ["desk"], pinned_rank: null, hidden: true },
    ];
    const result = attachCatalog(products, rows);
    expect(result.products.map((p) => p.id)).toEqual(["a"]);
    expect(result.products[0].tags).toEqual(defaultTagsFor("AI Hardware"));
  });

  it("ignores entries whose product is not eligible, instead of adding them", () => {
    const rows: CatalogRow[] = [{ product_id: "ghost", tags: ["ai"], pinned_rank: null, hidden: false }];
    expect(attachCatalog(products, rows).products).toEqual([]);
  });

  it("normalizes tags: trims, lowercases, removes empties and duplicates", () => {
    expect(normalizeTags([" AI ", "ai", "", "  ", "Books"])).toEqual(["ai", "books"]);
    expect(normalizeTags(null)).toEqual([]);
  });
});

describe("pins", () => {
  it("lists code pins first, then catalog pins by rank, without repeats", () => {
    const items = [
      { id: "x", pinned_rank: 2 },
      { id: "y", pinned_rank: 1 },
      { id: "z", pinned_rank: null },
    ];
    expect(pinOrder(items, ["x"])).toEqual(["x", "y"]);
    expect(pinOrder(items, [])).toEqual(["y", "x"]);
  });
});

describe("holiday lists use the dedicated tags", () => {
  it("puts only products carrying the holiday tag on that holiday's list", () => {
    const christmas = HOLIDAYS.find((h) => h.slug === "christmas-gifts")!;
    const scored = scoreProducts(
      [
        product("tagged", "AI Hardware", { tags: ["christmas-gifts"] }),
        product("untagged", "AI Hardware", { tags: ["black-friday"] }),
      ],
      []
    );
    expect(holidayTop(christmas, scored, 10, []).map((p) => p.id)).toEqual(["tagged"]);
  });
  it("still goes by category for products with no tags at all", () => {
    const christmas = HOLIDAYS.find((h) => h.slug === "christmas-gifts")!;
    const scored = scoreProducts([product("plain", "Books")], []);
    expect(holidayTop(christmas, scored, 10, []).map((p) => p.id)).toEqual(["plain"]);
  });
  it("has a Thanksgiving list that comes before Black Friday", () => {
    const slugs = HOLIDAYS.map((h) => h.slug);
    expect(slugs.indexOf("thanksgiving-week")).toBeLessThan(slugs.indexOf("black-friday"));
    expect(HOLIDAYS.every((h) => h.niche.length > 0)).toBe(true);
  });
});

describe("catalog tabs and paging", () => {
  const many = Array.from({ length: 45 }, (_, i) => item(String(i), i % 2 === 0 ? ["ai"] : ["books"], 45 - i));

  it("shows Trends first, and only the other tabs that have products", () => {
    const tabs = visibleTabs([item("1", ["books"])]);
    expect(tabs[0].slug).toBe("trends");
    expect(tabs.map((t) => t.slug)).toEqual(["trends", "books"]);
    expect(visibleTabs([]).map((t) => t.slug)).toEqual(["trends"]);
  });

  it("filters a tab by its tag and ranks by recent activity", () => {
    const books = CATALOG_TABS.find((t) => t.slug === "books")!;
    const result = itemsForTab(many, books);
    expect(result.every((i) => i.tags.includes("books"))).toBe(true);
    const scores = result.map((i) => i.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("caps a tab at 3 pages of 10", () => {
    const trends = CATALOG_TABS[0];
    expect(itemsForTab(many, trends)).toHaveLength(CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES);
  });

  it("puts pinned products first, in pin order", () => {
    const withPins = [item("a", ["ai"], 1), item("b", ["ai"], 99), item("c", ["ai"], 5, { pinned: 1 })];
    expect(itemsForTab(withPins, CATALOG_TABS[0]).map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("searches inside the tab", () => {
    const named = [item("1", ["ai"], 1, { name: "Mini PC Alpha" }), item("2", ["ai"], 2, { name: "Desk lamp" })];
    expect(itemsForTab(named, CATALOG_TABS[0], "mini").map((i) => i.id)).toEqual(["1"]);
    expect(itemsForTab(named, CATALOG_TABS[0], "zzzz")).toEqual([]);
  });

  it("paginates 10 at a time and clamps bad page numbers", () => {
    const list = Array.from({ length: 27 }, (_, i) => i);
    expect(paginate(list, 1)).toMatchObject({ page: 1, pages: 3, total: 27 });
    expect(paginate(list, 3).items).toEqual([20, 21, 22, 23, 24, 25, 26]);
    expect(paginate(list, 99).page).toBe(3);
    expect(paginate(list, -4).page).toBe(1);
    expect(paginate(list, Number.NaN).page).toBe(1);
    expect(paginate([], 1)).toMatchObject({ page: 1, pages: 1, total: 0, items: [] });
  });
});

describe("the pinned Top 10 series row", () => {
  const guide = (id: string, tags: string[], when: number) => ({
    _id: id,
    slug: `guide-${id}`,
    title: `Guide ${id}`,
    tags,
    publishDate: when,
    metadata: { heroImageUrl: id === "1" ? "https://img.example/1.jpg" : undefined },
  });

  it("names the niche from the first tag that is not a bookkeeping tag", () => {
    expect(nicheFromTags(["holiday-guide", "deals-pinned", "local-ai", "mini-pc"])).toBe("Local AI");
    expect(nicheFromTags(["holiday-guide", "standing-desks"])).toBe("Standing Desks");
    expect(nicheFromTags(["holiday-guide", "buying-guide"])).toBe("Buying guide");
    expect(nicheFromTags(null)).toBe("Buying guide");
  });

  it("puts pinned guides first (newest first), then the holiday lists", () => {
    const cards = buildSeries(
      [
        guide("1", ["holiday-guide", "deals-pinned", "local-ai"], 100),
        guide("2", ["holiday-guide", "deals-pinned", "books"], 200),
        guide("3", ["holiday-guide", "books"], 300), // not pinned
      ],
      20
    );
    expect(cards.slice(0, 2).map((c) => c.key)).toEqual(["article-2", "article-1"]);
    expect(cards[0]).toMatchObject({ kind: "article", niche: "Books", href: "/blog/guide-2" });
    expect(cards[1].image).toBe("https://img.example/1.jpg");
    expect(cards.slice(2).every((c) => c.kind === "holiday")).toBe(true);
    expect(cards.some((c) => c.key === "article-3")).toBe(false);
  });

  it("always has the holiday lists, even with no guides, and respects the limit", () => {
    const cards = buildSeries([]);
    expect(cards.map((c) => c.href)).toEqual(HOLIDAYS.map((h) => `/deals/${h.slug}`));
    expect(buildSeries([], 2)).toHaveLength(2);
    expect(new Set(cards.map((c) => c.niche)).size).toBe(cards.length); // each card has its own niche
  });
});
