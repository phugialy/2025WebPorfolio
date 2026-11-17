import { describe, expect, it } from "vitest";
import { ARTICLE_PROMO_COUNT, ARTICLE_PROMO_REF, isNonTechCategory, pickArticlePromo, seedOf } from "./deals-promo";
import { isDealsRef, dealsRef } from "./deals-core";

const PHOTO = "https://m.media-amazon.com/images/I/616-8VSyqdL._AC_SL1500_.jpg";
const p = (id: string, category: string | null, image: string | null = PHOTO) => ({ id, category, image_url: image });

const list = [
  p("t1", "Monitors"), p("t2", "Keyboards"), p("t3", "AI Hardware"),
  p("n1", "Home & Kitchen"), p("n2", "Personal Care"), p("n3", "Travel"),
];

describe("the end-of-article holiday picks card", () => {
  it("shows one tech pick beside two non-tech picks, so every view compares them", () => {
    const picks = pickArticlePromo(list, "some-article");
    expect(picks).toHaveLength(ARTICLE_PROMO_COUNT);
    expect(isNonTechCategory(picks[0].category)).toBe(false);
    expect(picks.slice(1).every((x) => isNonTechCategory(x.category))).toBe(true);
    expect(new Set(picks.map((x) => x.id)).size).toBe(ARTICLE_PROMO_COUNT);
  });

  it("is the same for one article every time, and different articles show different products", () => {
    expect(pickArticlePromo(list, "article-a").map((x) => x.id)).toEqual(pickArticlePromo(list, "article-a").map((x) => x.id));
    const seen = new Set<string>();
    for (const slug of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]) for (const x of pickArticlePromo(list, slug)) seen.add(x.id);
    expect(seen.size).toBeGreaterThan(ARTICLE_PROMO_COUNT);
  });

  it("leaves out a product with no real picture, including Amazon's placeholder logo", () => {
    const picks = pickArticlePromo(
      [p("t1", "Monitors", null), p("t2", "Keyboards", "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png"), p("t3", "Audio"), p("n1", "Travel"), p("n2", "Personal Care")],
      "x"
    );
    expect(picks.map((x) => x.id).sort()).toEqual(["n1", "n2", "t3"]);
  });

  it("fills with the other kind when one runs short, and never repeats a product", () => {
    const onlyTech = pickArticlePromo([p("t1", "Monitors"), p("t2", "Keyboards"), p("t3", "Audio"), p("t4", "Webcams")], "x");
    expect(onlyTech).toHaveLength(3);
    const onlyNonTech = pickArticlePromo([p("n1", "Travel"), p("n2", "Home & Kitchen"), p("n3", "Personal Care")], "x");
    expect(onlyNonTech).toHaveLength(3);
    const oneNonTech = pickArticlePromo([p("t1", "Monitors"), p("t2", "Keyboards"), p("t3", "Audio"), p("n1", "Travel")], "x");
    expect(new Set(oneNonTech.map((x) => x.id)).size).toBe(3);
    expect(oneNonTech.map((x) => x.id)).toContain("n1");
  });

  it("returns what it has for a short list, and nothing for an empty one", () => {
    expect(pickArticlePromo([p("t1", "Monitors")], "x")).toHaveLength(1);
    expect(pickArticlePromo([], "x")).toEqual([]);
  });

  it("uses a label the tracking endpoint accepts, so its clicks and impressions are counted", () => {
    expect(isDealsRef(dealsRef(ARTICLE_PROMO_REF))).toBe(true);
    expect(seedOf("same")).toBe(seedOf("same"));
    expect(seedOf("a")).not.toBe(seedOf("b"));
  });
});
