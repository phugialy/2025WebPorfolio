import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_PAGES,
  CATALOG_PAGE_SIZE,
  CATALOG_TABS,
  HOLIDAYS,
  attachCatalog,
  buildCategoryRows,
  buildManagerRows,
  buildSeries,
  defaultTagsFor,
  dropBooks,
  holidayTop,
  itemsForTab,
  nicheFromTags,
  normalizeTags,
  paginate,
  pinOrder,
  sanitizeOverride,
  scoreProducts,
  sectionSlugFor,
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

describe("joining the catalog overrides onto products", () => {
  const products = [product("a", "AI Hardware"), product("b", "Keyboards"), product("c", "Monitors")];

  it("shows every product with category tags when there are no overrides", () => {
    for (const rows of [null, undefined, []] as (CatalogRow[] | null | undefined)[]) {
      const result = attachCatalog(products, rows);
      expect(result.dedicated).toBe(false);
      expect(result.products.map((p) => p.id)).toEqual(["a", "b", "c"]);
      expect(result.products[0].tags).toContain("ai");
    }
  });

  it("auto-enrolls a product that has no row, next to one that does", () => {
    const rows: CatalogRow[] = [{ product_id: "b", tags: ["Books", " christmas-gifts "], pinned_rank: 2, hidden: false }];
    const result = attachCatalog(products, rows);
    expect(result.dedicated).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(result.products[1]).toMatchObject({ id: "b", tags: ["books", "christmas-gifts"], pinned_rank: 2 });
    expect(result.products[0]).toMatchObject({ id: "a", tags: defaultTagsFor("AI Hardware"), pinned_rank: null });
  });

  it("drops hidden entries, and an entry with no tags gets the category defaults", () => {
    const rows: CatalogRow[] = [
      { product_id: "a", tags: [], pinned_rank: null, hidden: false },
      { product_id: "b", tags: ["desk"], pinned_rank: null, hidden: true },
    ];
    const result = attachCatalog(products, rows);
    expect(result.products.map((p) => p.id)).toEqual(["a", "c"]);
    expect(result.products[0].tags).toEqual(defaultTagsFor("AI Hardware"));
  });

  it("ignores entries whose product is not eligible, instead of adding them", () => {
    const rows: CatalogRow[] = [{ product_id: "ghost", tags: ["ai"], pinned_rank: null, hidden: false }];
    expect(attachCatalog(products, rows).products.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("normalizes tags: trims, lowercases, removes empties and duplicates", () => {
    expect(normalizeTags([" AI ", "ai", "", "  ", "Books"])).toEqual(["ai", "books"]);
    expect(normalizeTags(null)).toEqual([]);
  });
});

describe("the manager rows and edits", () => {
  const products = [product("a", "AI Hardware"), product("b", "Keyboards"), product("c", "Monitors")];

  it("lists every product with its override state, hidden ones last", () => {
    const rows: CatalogRow[] = [{ product_id: "a", tags: ["ai"], pinned_rank: 1, hidden: true }];
    const list = buildManagerRows(products, rows);
    expect(list.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(list[2]).toMatchObject({ id: "a", hidden: true, overridden: true, pinned_rank: 1, tags: ["ai"] });
    expect(list[0]).toMatchObject({ id: "b", hidden: false, overridden: false, pinned_rank: null });
    expect(list[0].tags).toEqual(defaultTagsFor("Keyboards"));
  });

  it("accepts known tags, a pin, and a hide flag; drops unknown tags", () => {
    const result = sanitizeOverride({ tags: [" AI ", "ai", "not-a-tag", "black-friday"], hidden: false, pinned_rank: 3 });
    expect(result).toEqual({ ok: true, values: { tags: ["ai", "black-friday"], hidden: false, pinned_rank: 3 } });
    expect(sanitizeOverride({ pinned_rank: null })).toEqual({ ok: true, values: { pinned_rank: null } });
  });

  it("rejects bad input and empty edits", () => {
    expect(sanitizeOverride({ pinned_rank: 0 }).ok).toBe(false);
    expect(sanitizeOverride({ pinned_rank: 1.5 }).ok).toBe(false);
    expect(sanitizeOverride({ pinned_rank: "2" }).ok).toBe(false);
    expect(sanitizeOverride({ hidden: "yes" }).ok).toBe(false);
    expect(sanitizeOverride({ tags: "ai" }).ok).toBe(false);
    expect(sanitizeOverride({}).ok).toBe(false);
  });
});

describe("books stay off the Deals pages", () => {
  it("drops every product filed under a books category, including re-filed ones", () => {
    const kept = dropBooks([
      product("a", "AI Hardware"),
      product("b", "Machine Learning (Books)"),
      product("c", "Books"),
      product("d", "Keyboards"),
    ]);
    expect(kept.map((p) => p.id)).toEqual(["a", "d"]);
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

describe("category rows", () => {
  // An item in a catalog category, filed under its shopping section the way the page does.
  const inCat = (id: string, category: string | null, score = 0, extra: Partial<ExplorerItem> = {}) =>
    item(id, ["technology"], score, { category, section: sectionSlugFor(category), ...extra });
  const group = (category: string, n: number, prefix = category.slice(0, 3).toLowerCase()) =>
    Array.from({ length: n }, (_, i) => inCat(`${prefix}-${i}`, category, 100 - i));
  const ids = (rows: { items: ExplorerItem[] }[]) => rows.flatMap((r) => r.items.map((i) => i.id));

  it("makes one row per product category that has enough products, named for shoppers", () => {
    const rows = buildCategoryRows([...group("Monitors", 5), ...group("AI Hardware", 6), ...group("Audio", 5)]);
    expect(rows.map((r) => r.label)).toEqual(["Mini PCs and AI hardware", "Headphones and audio", "Monitors"]);
    expect(rows.map((r) => r.slug)).toEqual(["ai-hardware", "audio", "monitors"]);
  });

  it("shows every product exactly once across all rows", () => {
    const all = [...group("Monitors", 5), ...group("Keyboards", 4), inCat("c1", "Cables & Chargers"), inCat("c2", "Everyday Carry"), inCat("x", null), inCat("y", "Brand New Category")];
    const shown = ids(buildCategoryRows(all));
    expect([...shown].sort()).toEqual(all.map((i) => i.id).sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("puts small categories of one shopping section together, and the rest under More to browse", () => {
    const rows = buildCategoryRows([
      ...group("Monitors", 5),
      inCat("c1", "Cables & Chargers"),
      inCat("c2", "Cables & Chargers"),
      inCat("c3", "Cleaning & Care"),
      inCat("e1", "Everyday Carry"),
      inCat("s1", "Storage"),
      inCat("n1", null),
    ]);
    const everyday = rows.find((r) => r.slug === "everyday")!;
    expect(everyday.label).toBe("Everyday gadgets and small gifts");
    expect(everyday.items.map((i) => i.id).sort()).toEqual(["c1", "c2", "c3", "e1"]);
    const more = rows.find((r) => r.slug === "more")!;
    expect(more.items.map((i) => i.id).sort()).toEqual(["n1", "s1"]);
    expect(rows[rows.length - 1].slug).toBe("more");
  });

  it("orders rows by the season's priority, not by daily activity", () => {
    const quiet = group("AI Hardware", 5).map((i) => ({ ...i, score: 0 }));
    const busy = group("Keyboards", 5).map((i) => ({ ...i, score: 50 }));
    expect(buildCategoryRows([...busy, ...quiet]).map((r) => r.slug)).toEqual(["ai-hardware", "keyboards"]);
  });

  it("ranks by activity inside a row, with real pictures first, and caps a row at 30", () => {
    const pic = "https://m.media-amazon.com/images/I/71abc.jpg";
    const rows = buildCategoryRows([inCat("p1", "Webcams", 9), inCat("p2", "Webcams", 8, { image_url: pic }), inCat("p3", "Webcams", 7), inCat("p4", "Webcams", 6), inCat("p5", "Webcams", 5)]);
    expect(rows[0].items.map((i) => i.id)).toEqual(["p2", "p1", "p3", "p4", "p5"]);
    const big = buildCategoryRows(group("Monitors", 45));
    expect(big[0].items).toHaveLength(30);
    expect(big[0].items[0].id).toBe("mon-0");
    // The 15 that did not fit still appear somewhere.
    expect(ids(big)).toHaveLength(45);
  });

  it("puts mice and macro pads in the keyboards row instead of a second near-duplicate row", () => {
    const rows = buildCategoryRows([...group("Keyboards", 3), ...group("Input Devices", 3)]);
    expect(rows.map((r) => r.slug)).toEqual(["keyboards"]);
    expect(rows[0].label).toBe("Keyboards and mice");
    expect(rows[0].items).toHaveLength(6);
  });

  it("returns no rows for an empty catalog", () => {
    expect(buildCategoryRows([])).toEqual([]);
  });
});
