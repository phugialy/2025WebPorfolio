import { describe, expect, it } from "vitest";
import { MIN_VIEWS, summarizeBrandPage, sweeperKeys, type CardInfo, type ClickRow } from "./brand-stats-core";

const REF = "deals-brand-insta360";
const now = Date.parse("2026-11-28T12:00:00Z");
const since = now - 7 * 24 * 60 * 60 * 1000;
const cards = new Map<string, CardInfo>([
  ["cam", { name: "X5", group: "camera" }],
  ["acc", { name: "Selfie stick", group: "accessory" }],
]);
const click = (product: string, ua: string, at: string, ref = REF): ClickRow => ({ product_id: product, article_slug: ref, user_agent: ua, created_at: at });

describe("Insta360 page read-out", () => {
  it("flags a browser that opened 8+ products in a day, site-wide", () => {
    const sweep = Array.from({ length: 8 }, (_, i) => click(`p${i}`, "bot-ish", "2026-11-27T10:00:00Z", "deals-catalog-x"));
    expect(sweeperKeys(sweep).has("bot-ish|2026-11-27")).toBe(true);
    expect(sweeperKeys(sweep.slice(0, 7)).size).toBe(0);
  });

  it("counts seen and opened per card and group, dropping sweepers and other pages", () => {
    const impressions = [
      ...Array.from({ length: MIN_VIEWS }, () => ({ product_id: "cam", created_at: "2026-11-27T09:00:00Z" })),
      { product_id: "acc", created_at: "2026-11-27T09:00:00Z" },
      { product_id: "cam", created_at: "2026-11-01T09:00:00Z" }, // outside the window
    ];
    const sweeper = Array.from({ length: 8 }, (_, i) => click(i === 0 ? "acc" : `p${i}`, "sweeper", "2026-11-27T10:00:00Z", i === 0 ? REF : "deals-catalog-x"));
    const clicks = [click("cam", "shopper", "2026-11-27T10:00:00Z"), click("cam", "shopper", "2026-11-27T11:00:00Z", "deals-black-friday"), ...sweeper];
    const w = summarizeBrandPage({ ref: REF, impressions, allHumanClicks: clicks, cards, since, now });

    expect(w.seen).toBe(MIN_VIEWS + 1);
    expect(w.opened).toBe(1);
    expect(w.sweeperClicksDropped).toBe(1);
    expect(w.groups.camera).toEqual({ seen: MIN_VIEWS, opened: 1, ctr: 1 / MIN_VIEWS });
    expect(w.groups.accessory).toEqual({ seen: 1, opened: 0, ctr: 0 });
    expect(w.cards.find((c) => c.id === "cam")?.enoughViews).toBe(true);
    expect(w.cards.find((c) => c.id === "acc")?.enoughViews).toBe(false);
  });

  it("lists every day in the window, quiet ones included", () => {
    const w = summarizeBrandPage({ ref: REF, impressions: [], allHumanClicks: [], cards, since, now });
    expect(w.days).toHaveLength(8);
    expect(w.days[0].day).toBe("2026-11-21");
    expect(w.days.at(-1)).toEqual({ day: "2026-11-28", seen: 0, opened: 0 });
    expect(w.ctr).toBeNull();
  });
});
