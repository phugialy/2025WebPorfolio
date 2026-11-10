import { describe, expect, it } from "vitest";
import { FACT_LIMITS, SHOW_PRICE_CLASS, attachFacts, buildSeries, coverFor, normalizeFacts } from "./deals-core";

describe("normalizeFacts", () => {
  it("returns null for a missing row or a row with nothing usable", () => {
    expect(normalizeFacts(null)).toBeNull();
    expect(normalizeFacts(undefined)).toBeNull();
    expect(normalizeFacts({ product_id: "x" })).toBeNull();
    expect(normalizeFacts({ product_id: "x", what_it_is: "   ", strengths: ["", "  "], price_class: "premium" })).toBeNull();
  });

  it("trims, collapses whitespace and caps text, list lengths and list counts", () => {
    const facts = normalizeFacts({
      product_id: "x",
      what_it_is: `  A   34-inch\ncurved ultrawide ${"x".repeat(300)}`,
      strengths: ["one", "two", "three", "four", "five"],
      caveats: ["a", "b", "c"],
      key_specs: ["s1", "s2", "s3", "s4", "s5", "s6"],
    })!;
    expect(facts.whatItIs!.length).toBeLessThanOrEqual(FACT_LIMITS.line);
    expect(facts.whatItIs!.startsWith("A 34-inch curved ultrawide")).toBe(true);
    expect(facts.whatItIs!.endsWith("…")).toBe(true);
    expect(facts.strengths).toEqual(["one", "two", "three"]);
    expect(facts.caveats).toEqual(["a", "b"]);
    expect(facts.keySpecs).toHaveLength(FACT_LIMITS.specs);
  });

  it("drops values outside the allowed sets instead of showing them", () => {
    const facts = normalizeFacts({
      product_id: "x",
      what_it_is: "Mini PC",
      price_class: "luxury",
      verdict: "best ever",
      confidence: "certain",
      evidence_count: -3,
      evidence_newest: "last week",
    })!;
    expect(facts.priceClass).toBeNull();
    expect(facts.verdict).toBeNull();
    expect(facts.confidence).toBeNull();
    expect(facts.evidenceCount).toBeNull();
    expect(facts.evidenceNewest).toBeNull();
  });

  it("keeps valid verdict, confidence and evidence", () => {
    const facts = normalizeFacts({
      product_id: "x",
      verdict: "recommended_with_caveats",
      confidence: "medium",
      evidence_count: 2,
      evidence_newest: "2025-12-15T00:00:00Z",
      price_class: "mainstream",
      guide_slug: "curved-monitors",
    })!;
    expect(facts).toMatchObject({
      verdict: "recommended_with_caveats",
      confidence: "medium",
      evidenceCount: 2,
      evidenceNewest: "2025-12-15",
      priceClass: "mainstream",
      guideSlug: "curved-monitors",
    });
  });

  it("keeps the price class hidden until the owner turns it on", () => {
    expect(SHOW_PRICE_CLASS).toBe(false);
  });
});

describe("attachFacts", () => {
  const products = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("attaches facts by product id and leaves the rest null", () => {
    const out = attachFacts(products, [{ product_id: "b", what_it_is: "Docking station" }, { product_id: "zzz", what_it_is: "Unknown product" }]);
    expect(out.map((p) => p.facts?.whatItIs ?? null)).toEqual([null, "Docking station", null]);
  });

  it("treats a missing table (null rows) as no facts", () => {
    expect(attachFacts(products, null).every((p) => p.facts === null)).toBe(true);
  });
});

describe("coverFor", () => {
  const item = (name: string, category: string | null, image: string | null) => ({ name, category, image_url: image });

  it("returns nothing for an empty list", () => {
    expect(coverFor([])).toBeUndefined();
  });

  it("takes the first three real photos and the first three distinct categories", () => {
    const cover = coverFor([
      item("a", "Mini PCs", "https://img/a.jpg"),
      item("b", "Mini PCs", "https://img/b.jpg"),
      item("c", "Monitors", "https://img/c.jpg"),
      item("d", "Keyboards", "https://img/d.jpg"),
      item("e", "Docks", "https://img/e.jpg"),
    ])!;
    expect(cover.images.map((i) => i.src)).toEqual(["https://img/a.jpg", "https://img/b.jpg", "https://img/c.jpg"]);
    expect(cover.categories).toEqual(["Mini PCs", "Monitors", "Keyboards"]);
    expect(cover.count).toBe(5);
  });

  it("skips Amazon's placeholder logo, missing images and repeats", () => {
    const logo = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";
    const cover = coverFor([item("a", "X", logo), item("b", "X", null), item("c", "X", "https://img/c.jpg"), item("d", "X", "https://img/c.jpg")])!;
    expect(cover.images).toEqual([{ src: "https://img/c.jpg", alt: "c" }]);
    expect(cover.count).toBe(4);
  });

  it("goes onto the Top 10 cards for holidays only", () => {
    const covers = { "black-friday": coverFor([item("a", "Monitors", "https://img/a.jpg")]) };
    const cards = buildSeries([], 8, covers);
    const bf = cards.find((c) => c.key === "holiday-black-friday")!;
    expect(bf.cover?.categories).toEqual(["Monitors"]);
    expect(cards.find((c) => c.key === "holiday-cyber-monday")!.cover).toBeUndefined();
  });
});
