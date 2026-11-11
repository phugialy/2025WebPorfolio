import { describe, expect, it } from "vitest";
import type { ExplorerItem } from "./deals-core";
import { PULL_WEIGHTS, pullParts, pullScore, searchDeals, searchTerms, stem, suggest, whyShown } from "./deals-search";

const PHOTO = "https://m.media-amazon.com/images/I/71abc.jpg";
const LOGO = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";

function item(over: Partial<ExplorerItem> & { id: string; name: string }): ExplorerItem {
  return { category: null, section: "x", image_url: PHOTO, buy_if: null, score: 0, rising: false, tags: [], pinned: null, rotation: 0, ...over };
}

const CATALOG: ExplorerItem[] = [
  item({ id: "h1", name: "Bose QuietComfort Headphones - Wireless Bluetooth Headphones", category: "Audio", section: "audio", score: 4 }),
  item({ id: "h2", name: "JBL Tune 770NC - Wireless Over-Ear Headphones - Black", category: "Audio", section: "audio" }),
  item({ id: "m1", name: "LG 34WN80C-B UltraWide Monitor 34 Curved WQHD", category: "Monitors", section: "desk" }),
  item({ id: "k1", name: "Logitech Ergo K860 Wireless Ergonomic Split Keyboard", category: "Keyboards", section: "desk", buy_if: "You type all day and your wrists ache" }),
  item({ id: "b1", name: "Practical Training for Machine Learning", category: "Books", section: "books", tags: ["books", "ai"] }),
  item({ id: "p1", name: "GMKtec K15 AI Mini PC Intel Ultra 5 32GB", category: "AI Hardware", section: "ai", tags: ["ai", "technology"] }),
];

describe("search words", () => {
  it("drops filler, stems plurals and keeps short model words", () => {
    expect(searchTerms("The best Headphones for me")).toEqual(["headphone"]);
    expect(searchTerms("4K  webcams")).toEqual(["4k", "webcam"]);
    expect(searchTerms("   ")).toEqual([]);
    expect(stem("Glass")).toBe("glass");
  });

  it("collapses repeated words", () => {
    expect(searchTerms("desk desk Desk")).toEqual(["desk"]);
  });
});

describe("search tiers", () => {
  it("finds a direct match in the exact tier", () => {
    const r = searchDeals(CATALOG, "headphones");
    expect(r.tier).toBe("exact");
    expect(r.hits.map((h) => h.item.id).sort()).toEqual(["h1", "h2"]);
    expect(r.suggestions).toEqual([]);
  });

  it("requires every typed word for an exact match", () => {
    expect(searchDeals(CATALOG, "wireless headphones").tier).toBe("exact");
    // "ergonomic" and "keyboard" are both in the keyboard's name; "monitor" is not.
    expect(searchDeals(CATALOG, "ergonomic keyboard").hits.map((h) => h.item.id)).toEqual(["k1"]);
  });

  it("matches from the start of a word, not inside one", () => {
    // "ai" must not match "Training" or "Wireless".
    const r = searchDeals(CATALOG, "ai");
    expect(r.hits.map((h) => h.item.id).sort()).toEqual(["b1", "p1"]);
  });

  it("uses a related word and says so (earbuds -> headphones)", () => {
    const r = searchDeals(CATALOG, "earbuds");
    expect(r.tier).toBe("close");
    expect(r.hits.map((h) => h.item.id).sort()).toEqual(["h1", "h2"]);
    expect(whyShown(r.hits[0])).toBe('Matched "headphone" for "earbud"');
  });

  it("does not stretch a related word too far (earbuds must not find an audio capture box)", () => {
    const withBox = [...CATALOG, item({ id: "c1", name: "ClearClick Video to USB 1080P Audio Capture", category: "Input Devices" })];
    expect(searchDeals(withBox, "earbuds").hits.map((h) => h.item.id)).not.toContain("c1");
  });

  it("matches the buy-if line", () => {
    expect(searchDeals(CATALOG, "wrists").hits[0].item.id).toBe("k1");
  });

  it("matches a gift search through the holiday tag", () => {
    const withTag = [...CATALOG, item({ id: "g1", name: "Wacom Intuos Drawing Tablet", category: "Creative Tools", tags: ["christmas-gifts"] })];
    expect(searchDeals(withTag, "gift").hits.map((h) => h.item.id)).toContain("g1");
  });

  it("falls to close when most words match", () => {
    const r = searchDeals(CATALOG, "wireless headphones sale");
    expect(r.tier).toBe("close");
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it("returns none with suggestions when nothing is relevant", () => {
    const r = searchDeals(CATALOG, "refrigerator");
    expect(r.tier).toBe("none");
    expect(r.hits).toEqual([]);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("treats an empty or filler-only search as none, still with suggestions", () => {
    const r = searchDeals(CATALOG, "the best");
    expect(r.tier).toBe("none");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

describe("pull: what makes a product attractive enough to click", () => {
  it("weights add to one", () => {
    expect(Object.values(PULL_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("scores a product with a photo, a reason, activity, a label and a guide above a bare one", () => {
    const bare = item({ id: "x", name: "Thing", image_url: null });
    const rich = item({ id: "y", name: "Thing", buy_if: "You want a quiet room to work in", score: 7, badge: "trending" });
    expect(pullScore(rich, true)).toBeGreaterThan(pullScore(bare));
    expect(pullScore(rich, true)).toBeLessThanOrEqual(1);
  });

  it("does not count Amazon's logo as a photo", () => {
    expect(pullParts(item({ id: "x", name: "T", image_url: LOGO })).photo).toBe(0);
    expect(pullParts(item({ id: "x", name: "T", image_url: PHOTO })).photo).toBe(1);
  });

  it("does not count a too-short reason", () => {
    expect(pullParts(item({ id: "x", name: "T", buy_if: "good" })).reason).toBe(0);
  });

  it("flattens activity so one hot product cannot bury the rest", () => {
    const small = pullParts(item({ id: "a", name: "T", score: 3 })).activity;
    const huge = pullParts(item({ id: "b", name: "T", score: 500 })).activity;
    expect(huge).toBe(1);
    expect(small).toBeGreaterThan(0.5);
  });

  it("puts the more attractive of two equally relevant products first", () => {
    const a = item({ id: "a", name: "Wireless Headphones A", category: "Audio", image_url: null });
    const b = item({ id: "b", name: "Wireless Headphones B", category: "Audio", buy_if: "You work in a noisy open office", score: 6 });
    expect(searchDeals([a, b], "headphones").hits.map((h) => h.item.id)).toEqual(["b", "a"]);
  });

  it("keeps a clearly more relevant product ahead of a flashier weaker match", () => {
    const direct = item({ id: "d", name: "Mechanical Keyboard", category: "Keyboards", image_url: null });
    const weak = item({ id: "w", name: "Desk Mat", buy_if: "Pairs with any keyboard on your desk", score: 9, badge: "trending" });
    expect(searchDeals([weak, direct], "keyboard").hits[0].item.id).toBe("d");
  });
});

describe("suggestions for an unmet search", () => {
  it("leads with the most attractive and never shows more than two from one section", () => {
    const many = Array.from({ length: 8 }, (_, i) => item({ id: `k${i}`, name: `Keyboard ${i}`, section: "desk", score: 10 - i }));
    const out = suggest([...many, ...CATALOG]);
    const desk = out.filter((h) => h.item.section === "desk");
    expect(desk.length).toBeLessThanOrEqual(2);
    expect(out.length).toBeLessThanOrEqual(6);
  });

  it("shows at most three of any one size, so it is not six small add-ons", () => {
    const small = Array.from({ length: 6 }, (_, i) => item({ id: `s${i}`, name: `Charger ${i}`, category: "Cables & Chargers", section: `sec${i}`, score: 9 }));
    const big = [item({ id: "l1", name: "Laptop", category: "Laptops", section: "lap" })];
    const out = suggest([...small, ...big]);
    expect(out.filter((h) => h.item.category === "Cables & Chargers")).toHaveLength(3);
    expect(out.some((h) => h.item.id === "l1")).toBe(true);
  });

  it("ranks products with a guide higher when guide ids are supplied", () => {
    const a = item({ id: "a", name: "A", section: "s1" });
    const b = item({ id: "b", name: "B", section: "s2" });
    expect(suggest([a, b], new Set(["b"]))[0].item.id).toBe("b");
  });

  it("is empty for an empty catalog", () => {
    expect(suggest([])).toEqual([]);
    expect(searchDeals([], "anything").tier).toBe("none");
  });
});
