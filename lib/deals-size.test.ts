import { describe, expect, it } from "vitest";
import { filterExplorer, type ExplorerItem } from "./deals-core";
import { PURCHASE_SIZES, PURCHASE_SIZE_BY_PRODUCT, PURCHASE_SIZE_LABEL, PURCHASE_SIZE_LEGEND, isPurchaseSize, purchaseSize } from "./deals-size";

const MINI_PC = "aede1291-e3e7-427b-9b7e-6e7b484d224b"; // big
const WEBCAM_MID = "a758efad-4536-4e95-9c82-567191f3acbf"; // mid
const CABLE = "bb6f6d20-a4e5-4145-95ce-78b41a3eb0e7"; // small

function item(id: string, name: string, category: string): ExplorerItem {
  return { id, name, category, section: "x", image_url: null, buy_if: null, score: 0, rising: false, tags: [], pinned: null, rotation: 0 };
}

describe("purchase size data", () => {
  it("only uses known sizes and well-formed product ids", () => {
    for (const [id, size] of Object.entries(PURCHASE_SIZE_BY_PRODUCT)) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(isPurchaseSize(size)).toBe(true);
    }
  });

  it("has a label for every size, with one to three dots increasing", () => {
    expect(PURCHASE_SIZES.map((s) => PURCHASE_SIZE_LABEL[s].dots)).toEqual([1, 2, 3]);
  });

  it("never carries a dollar amount or dollar sign in any label or in the legend", () => {
    const text = [...PURCHASE_SIZES.flatMap((s) => [PURCHASE_SIZE_LABEL[s].text, PURCHASE_SIZE_LABEL[s].plural]), PURCHASE_SIZE_LEGEND].join(" ");
    expect(text).not.toMatch(/\$|\bUSD\b|\bdollars?\b/i);
  });
});

describe("purchaseSize", () => {
  it("uses the hand-assigned size for a listed product, whatever its category", () => {
    expect(purchaseSize({ id: MINI_PC, category: "AI Hardware" })).toBe("big");
    expect(purchaseSize({ id: WEBCAM_MID, category: "Webcams" })).toBe("mid");
    expect(purchaseSize({ id: CABLE, category: "Cables & Chargers" })).toBe("small");
  });

  it("falls back to the category only where every product in it is about the same size", () => {
    expect(purchaseSize({ id: "new-1", category: "Laptops" })).toBe("big");
    expect(purchaseSize({ id: "new-2", category: " smartwatches " })).toBe("mid");
    expect(purchaseSize({ id: "new-3", category: "Cleaning & Care" })).toBe("small");
  });

  it("shows no label for an unlisted product in a mixed category, instead of guessing", () => {
    expect(purchaseSize({ id: "new-4", category: "Webcams" })).toBeNull();
    expect(purchaseSize({ id: "new-5", category: "AI Hardware" })).toBeNull();
    expect(purchaseSize({ id: "new-6", category: null })).toBeNull();
    expect(purchaseSize({})).toBeNull();
  });
});

describe("filterExplorer by size", () => {
  const items = [item(MINI_PC, "Mini PC", "AI Hardware"), item(WEBCAM_MID, "Webcam", "Webcams"), item(CABLE, "Cable", "Cables & Chargers"), item("zzz", "Mystery", "Webcams")];

  it("returns only the products of that size", () => {
    expect(filterExplorer(items, { size: "big" }).map((i) => i.id)).toEqual([MINI_PC]);
    expect(filterExplorer(items, { size: "mid" }).map((i) => i.id)).toEqual([WEBCAM_MID]);
    expect(filterExplorer(items, { size: "small" }).map((i) => i.id)).toEqual([CABLE]);
  });

  it("leaves unlabeled products out of a size choice but keeps them for 'all'", () => {
    expect(filterExplorer(items, { size: "all" })).toHaveLength(4);
    expect(filterExplorer(items, {})).toHaveLength(4);
    expect(filterExplorer(items, { size: "mid" }).some((i) => i.id === "zzz")).toBe(false);
  });

  it("combines with a search", () => {
    expect(filterExplorer(items, { size: "big", query: "webcam" })).toEqual([]);
    expect(filterExplorer(items, { size: "mid", query: "webcam" }).map((i) => i.id)).toEqual([WEBCAM_MID]);
  });
});
