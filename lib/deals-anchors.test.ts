import { describe, expect, it } from "vitest";
import { shownOrder, type ScoredProduct } from "./deals-core";

const PIC = "https://m.media-amazon.com/images/I/71abc.jpg";
const PLACEHOLDER = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";

function p(id: string, score: number, image: string | null, rotation = 1): ScoredProduct {
  return {
    id,
    name: `Product ${id}`,
    category: "AI Hardware",
    image_url: image,
    description: null,
    buy_if: null,
    is_partner: false,
    flag_reason: null,
    score,
    previous: 0,
    rising: false,
    rotation,
  };
}

describe("the first places keep the most-opened products, with a real picture", () => {
  it("skips a most-opened product that has only a placeholder tile when enough have pictures", () => {
    const list = [p("power-bank", 12, PLACEHOLDER), p("mini-pc", 9, PIC), p("monitor", 8, PIC), p("dock", 7, PIC), p("tail", 0, PIC)];
    const order = shownOrder(list, 2).map((x) => x.id);
    expect(order.slice(0, 2)).toEqual(["mini-pc", "monitor"]);
    // It is not dropped: it just no longer holds an anchored place.
    expect(order).toContain("power-bank");
  });

  it("falls back to plain activity order when too few have pictures", () => {
    const list = [p("a", 12, PLACEHOLDER), p("b", 9, PIC), p("c", 0, PIC)];
    expect(shownOrder(list, 2).map((x) => x.id).slice(0, 2)).toEqual(["a", "b"]);
  });

  it("does nothing different when rotation is off", () => {
    const list = [p("a", 12, PLACEHOLDER, 0), p("b", 9, PIC, 0), p("c", 8, PIC, 0)];
    expect(shownOrder(list, 2).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
