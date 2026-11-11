import { describe, expect, it } from "vitest";
import { AUTOMATED_MIN_PRODUCTS, BADGE_LIMITS, NEW_DAYS, TRENDING_MIN_BROWSERS, assignBadges, scoreProducts, type ClickRow, type DealsProduct, type ScoredProduct } from "./deals-core";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const DAY = 86_400_000;
const PIC = "https://m.media-amazon.com/images/I/71abc.jpg";
const LOGO = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";

function scored(id: string, extra: Partial<ScoredProduct> = {}): ScoredProduct {
  return {
    id,
    name: `Product ${id}`,
    category: "Monitors",
    image_url: PIC,
    description: null,
    buy_if: null,
    is_partner: false,
    flag_reason: null,
    created_at: new Date(NOW - 90 * DAY).toISOString(),
    score: 0,
    previous: 0,
    rising: false,
    dealsBrowsers: 0,
    ...extra,
  };
}
const busy = (id: string, browsers: number, score = browsers * 2, previous = 0) => scored(id, { dealsBrowsers: browsers, score, previous });
const fresh = (id: string, daysAgo: number, extra: Partial<ScoredProduct> = {}) => scored(id, { created_at: new Date(NOW - daysAgo * DAY).toISOString(), ...extra });

describe("Deals-page browsers in the score", () => {
  const product = (id: string): DealsProduct => ({ id, name: id, category: null, image_url: PIC, description: null, buy_if: null, is_partner: false, flag_reason: null });
  const click = (id: string, ua: string, daysAgo: number, slug = "deals-trending"): ClickRow => ({ product_id: id, user_agent: ua, created_at: new Date(NOW - daysAgo * DAY).toISOString(), article_slug: slug });

  it("counts distinct browsers in the last week, not repeat visits by one person", () => {
    const clicks = [click("a", "one", 1), click("a", "one", 2), click("a", "one", 3), click("a", "two", 1), click("a", "old", 9)];
    const [a] = scoreProducts([product("a")], clicks, NOW);
    expect(a.score).toBe(4); // browser-days, the older measure
    expect(a.dealsBrowsers).toBe(2); // people
  });

  it("leaves out clicks that came through article pages, which include automated visitors", () => {
    const many = Array.from({ length: 12 }, (_, i) => click("a", `bot-${i}`, 1, "some-article-slug"));
    const [a] = scoreProducts([product("a")], [...many, click("a", "real", 1)], NOW);
    expect(a.dealsBrowsers).toBe(1);
    expect(a.score).toBeGreaterThan(5); // the ranking still sees them; only the Trending label ignores them
  });
});

describe("assignBadges: labels are rare", () => {
  it("labels nothing when nobody has enough activity and nothing is new (the usual day)", () => {
    const list = [busy("a", 2), busy("b", 4), scored("c")];
    expect([...assignBadges(list, NOW)]).toEqual([]);
  });

  it(`needs ${TRENDING_MIN_BROWSERS} different browsers and clear growth to be Trending`, () => {
    const list = [
      busy("enough", TRENDING_MIN_BROWSERS, 12, 4),
      busy("too-few", TRENDING_MIN_BROWSERS - 1, 30, 0),
      busy("flat", TRENDING_MIN_BROWSERS + 3, 10, 10), // plenty of people but not rising
    ];
    expect([...assignBadges(list, NOW)]).toEqual([["enough", "trending"]]);
  });

  it(`gives Trending to at most ${BADGE_LIMITS.trending} products, the busiest first`, () => {
    const list = [busy("a", 6), busy("b", 9), busy("c", 7), busy("d", 8), busy("e", 5)];
    const badges = assignBadges(list, NOW);
    expect([...badges.keys()].sort()).toEqual(["b", "c", "d"]);
    expect([...badges.values()].every((v) => v === "trending")).toBe(true);
  });

  it(`gives New to at most ${BADGE_LIMITS.new} products added in the last ${NEW_DAYS} days, newest first`, () => {
    const list = [fresh("old", 30), fresh("w1", 6), fresh("w2", 2), fresh("w3", 4), fresh("edge", NEW_DAYS + 1)];
    const badges = assignBadges(list, NOW);
    expect([...badges.keys()]).toEqual(["w2", "w3"]);
    expect([...badges.values()].every((v) => v === "new")).toBe(true);
  });

  it("never labels a product with no real picture, and a trending product is not also New", () => {
    const list = [busy("logo", 9, 20, 0), { ...fresh("new-logo", 1), image_url: LOGO }, { ...fresh("both", 1), dealsBrowsers: 6, score: 12, previous: 1 }];
    const badges = assignBadges(list.map((p) => (p.id === "logo" ? { ...p, image_url: LOGO } : p)) as ScoredProduct[], NOW);
    expect(badges.get("logo")).toBeUndefined();
    expect(badges.get("new-logo")).toBeUndefined();
    expect(badges.get("both")).toBe("trending");
  });

  it("ignores products with a creation date in the future or none", () => {
    const list = [fresh("future", -3), scored("none", { created_at: null }), scored("missing", { created_at: undefined })];
    expect([...assignBadges(list, NOW)]).toEqual([]);
  });
});

describe("crawlers are ignored", () => {
  const product = (id: string): DealsProduct => ({ id, name: id, category: null, image_url: PIC, description: null, buy_if: null, is_partner: false, flag_reason: null });
  const click = (id: string, ua: string, hoursAgo = 6): ClickRow => ({ product_id: id, user_agent: ua, created_at: new Date(NOW - hoursAgo * 3_600_000).toISOString(), article_slug: "deals-catalog-technology" });

  it(`drops a browser that opened ${AUTOMATED_MIN_PRODUCTS} or more different products in a day`, () => {
    const ids = Array.from({ length: AUTOMATED_MIN_PRODUCTS }, (_, i) => `p${i}`);
    const products = ids.map(product);
    const scoredList = scoreProducts(products, ids.map((id) => click(id, "crawler")), NOW);
    expect(scoredList.every((p) => p.score === 0 && p.dealsBrowsers === 0)).toBe(true);
  });

  it("keeps a browser that compared a few products, and the same browser on another day", () => {
    const ids = Array.from({ length: AUTOMATED_MIN_PRODUCTS - 1 }, (_, i) => `p${i}`);
    const scoredList = scoreProducts(ids.map(product), ids.map((id) => click(id, "shopper")), NOW);
    expect(scoredList.every((p) => p.score === 1 && p.dealsBrowsers === 1)).toBe(true);
    // The crawler on one day does not poison the same browser string on a different day.
    const wide = Array.from({ length: AUTOMATED_MIN_PRODUCTS }, (_, i) => `w${i}`);
    const mixed = scoreProducts([...wide.map(product), product("later")], [...wide.map((id) => click(id, "ua", 6)), click("later", "ua", 30)], NOW);
    expect(mixed.find((p) => p.id === "later")!.score).toBe(1);
    expect(mixed.find((p) => p.id === "w0")!.score).toBe(0);
  });
});
