import { describe, expect, it } from "vitest";
import {
  HOLIDAYS,
  buildSeries,
  currentHoliday,
  dealsToday,
  daysBetween,
  displayOrder,
  getHoliday,
  holidayStatuses,
  holidayTop,
  listCategories,
  monthDay,
  scoreProducts,
  type DealsProduct,
} from "./deals-core";

// Noon in Chicago, which is 18:00 UTC in these months (standard time, UTC-6).
const at = (iso: string) => Date.parse(`${iso}T18:00:00Z`);
const phases = (iso: string) => Object.fromEntries(holidayStatuses(at(iso)).map((s) => [s.holiday.slug, s.phase]));

describe("the holiday calendar", () => {
  it("windows follow each other with no gap and no overlap, from Nov 1 to Jan 3", () => {
    expect(HOLIDAYS[0].window.from).toBe("2026-11-01");
    expect(HOLIDAYS[HOLIDAYS.length - 1].window.to).toBe("2027-01-03");
    for (let i = 1; i < HOLIDAYS.length; i++) {
      expect(daysBetween(HOLIDAYS[i - 1].window.to, HOLIDAYS[i].window.from), HOLIDAYS[i].slug).toBe(1);
    }
    for (const h of HOLIDAYS) {
      expect(h.window.from <= h.date && h.date <= h.window.to, `${h.slug} date is inside its own window`).toBe(true);
    }
  });

  it("walks Thanksgiving -> Black Friday -> Cyber Monday -> Christmas -> New Year", () => {
    expect(phases("2026-11-11")).toEqual({
      "thanksgiving-week": "now",
      "black-friday": "next",
      "cyber-monday": "later",
      "christmas-gifts": "later",
      "new-year-setup": "later",
    });
    expect(currentHoliday(at("2026-11-26"))?.holiday.slug).toBe("thanksgiving-week");
    expect(currentHoliday(at("2026-11-27"))?.holiday.slug).toBe("black-friday");
    expect(currentHoliday(at("2026-11-29"))?.holiday.slug).toBe("black-friday");
    expect(currentHoliday(at("2026-11-30"))?.holiday.slug).toBe("cyber-monday");
    expect(currentHoliday(at("2026-12-01"))?.holiday.slug).toBe("cyber-monday");
    expect(currentHoliday(at("2026-12-02"))?.holiday.slug).toBe("christmas-gifts");
    expect(currentHoliday(at("2026-12-25"))?.holiday.slug).toBe("christmas-gifts");
    expect(currentHoliday(at("2026-12-26"))?.holiday.slug).toBe("new-year-setup");
    expect(currentHoliday(at("2027-01-02"))?.holiday.slug).toBe("new-year-setup");
  });

  it("marks what is over as ended and exactly one holiday as next", () => {
    expect(phases("2026-12-05")).toEqual({
      "thanksgiving-week": "ended",
      "black-friday": "ended",
      "cyber-monday": "ended",
      "christmas-gifts": "now",
      "new-year-setup": "next",
    });
    for (const day of ["2026-11-02", "2026-11-28", "2026-12-10", "2026-12-30"]) {
      const next = holidayStatuses(at(day)).filter((s) => s.phase === "next");
      expect(next.length, day).toBeLessThanOrEqual(1);
    }
  });

  it("turns over at midnight in Chicago, not UTC", () => {
    // 01:00 UTC on Nov 27 is still the evening of Nov 26 in Chicago.
    const lateThursday = Date.parse("2026-11-27T01:00:00Z");
    expect(dealsToday(lateThursday)).toBe("2026-11-26");
    expect(currentHoliday(lateThursday)?.holiday.slug).toBe("thanksgiving-week");
    const earlyFriday = Date.parse("2026-11-27T07:00:00Z"); // 01:00 in Chicago
    expect(currentHoliday(earlyFriday)?.holiday.slug).toBe("black-friday");
  });

  it("says in words what is on, coming and over", () => {
    const s = (iso: string, slug: string) => holidayStatuses(at(iso)).find((x) => x.holiday.slug === slug)!;
    expect(s("2026-11-11", "thanksgiving-week")).toMatchObject({ label: "On now", short: "Now" });
    expect(s("2026-11-11", "black-friday")).toMatchObject({ label: "Starts Nov 27", short: "16d" }); // far off: the date
    expect(s("2026-11-20", "black-friday")).toMatchObject({ label: "Starts in 7 days", short: "7d" }); // close: a countdown
    expect(s("2026-11-26", "black-friday")).toMatchObject({ label: "Starts tomorrow" });
    expect(s("2026-11-11", "new-year-setup").label).toBe("Starts Dec 26");
    expect(s("2026-11-11", "new-year-setup").short).toBe("45d");
    expect(s("2026-11-02", "new-year-setup").short).toBe(""); // more than 45 days away: no chip
    expect(s("2026-12-05", "black-friday")).toMatchObject({ label: "Ended", short: "Ended" });
  });

  it("counts days to the day itself", () => {
    const bf = holidayStatuses(at("2026-11-11")).find((x) => x.holiday.slug === "black-friday")!;
    expect(bf.daysToDate).toBe(16);
    expect(holidayStatuses(at("2026-11-27")).find((x) => x.holiday.slug === "black-friday")!.daysToDate).toBe(0);
  });

  it("shows the one on now first, then what is coming in order, then what is over", () => {
    const order = displayOrder(holidayStatuses(at("2026-12-05"))).map((s) => s.holiday.slug);
    expect(order).toEqual(["christmas-gifts", "new-year-setup", "thanksgiving-week", "black-friday", "cyber-monday"]);
    const early = displayOrder(holidayStatuses(at("2026-11-11"))).map((s) => s.holiday.slug);
    expect(early).toEqual(HOLIDAYS.map((h) => h.slug));
  });

  it("formats a month and day", () => {
    expect(monthDay("2026-12-02")).toBe("Dec 2");
    expect(monthDay("2027-01-01")).toBe("Jan 1");
  });

  it("lists the distinct categories on a list, in order", () => {
    expect(listCategories([{ category: "Audio" }, { category: "Audio" }, { category: null }, { category: "Monitors" }])).toEqual(["Audio", "Monitors"]);
    expect(listCategories([{ category: "A" }, { category: "B" }, { category: "C" }], 2)).toEqual(["A", "B"]);
  });
});

describe("holiday copy and design", () => {
  it("each holiday has its own color, a readable accent, an intent line and a focus", () => {
    const hex = /^#[0-9A-F]{6}$/i;
    const luminance = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(new Set(HOLIDAYS.map((h) => h.theme.accent)).size).toBe(HOLIDAYS.length);
    for (const h of HOLIDAYS) {
      expect(h.theme.accent, h.slug).toMatch(hex);
      expect(h.theme.deep, h.slug).toMatch(hex);
      expect(h.theme.tint, h.slug).toMatch(hex);
      // White text on the accent must clear 4.5:1.
      expect(1.05 / (luminance(h.theme.accent) + 0.05), `${h.slug} contrast`).toBeGreaterThanOrEqual(4.5);
      expect(h.intent.length, h.slug).toBeGreaterThan(20);
      expect(h.focus.length, h.slug).toBeGreaterThan(0);
    }
  });

  it("the intent lines say nothing about prices, discounts or books", () => {
    for (const h of HOLIDAYS) expect(h.intent, h.slug).not.toMatch(/\$|percent|% off|\bdiscount|\bcheapest\b|\bbooks?\b/i);
  });

  it("the Deals copy no longer calls every list tech or AI-builder only", () => {
    for (const h of HOLIDAYS) {
      expect(`${h.h1} ${h.seoTitle} ${h.niche}`, h.slug).not.toMatch(/AI builders?|who builds with AI|developers/i);
    }
  });
});

describe("a holiday's focus", () => {
  const p = (id: string, category: string, extra: Partial<DealsProduct> = {}): DealsProduct =>
    ({ id, name: id, category, ...extra }) as DealsProduct;
  const catalog = [
    ...["kb1", "kb2", "kb3", "kb4"].map((id) => p(id, "Keyboards")),
    ...["lap1", "lap2"].map((id) => p(id, "Laptops")),
    ...["mon1", "mon2"].map((id) => p(id, "Monitors")),
    ...["fry1", "fry2"].map((id) => p(id, "Home & Kitchen")),
  ];
  const scored = scoreProducts(catalog, [], Date.UTC(2026, 10, 11));

  it("puts the holiday's focus categories first, and still fills the list from the rest", () => {
    const bf = getHoliday("black-friday")!; // laptops, monitors and home first; keyboards are in scope but not focus
    const list = holidayTop(bf, scored, 10, []).map((x) => x.id);
    expect(list).toHaveLength(10);
    const firstKeyboard = list.findIndex((id) => id.startsWith("kb"));
    const lastFocus = Math.max(...list.map((id, i) => (/^(lap|mon|fry)/.test(id) ? i : -1)));
    expect(lastFocus).toBeLessThan(firstKeyboard);
  });

  it("a different holiday leads with different products from the same catalog", () => {
    const cm = getHoliday("cyber-monday")!; // keyboards first
    expect(holidayTop(cm, scored, 10, [])[0].id).toMatch(/^kb/);
    const bf = getHoliday("black-friday")!;
    expect(holidayTop(bf, scored, 10, [])[0].id).not.toMatch(/^kb/);
  });

  it("does not move the most-opened products out of the first places", () => {
    const clicks = Array.from({ length: 5 }, (_, i) => ({
      product_id: "kb1",
      user_agent: `browser-${i}`,
      created_at: new Date(Date.UTC(2026, 10, 10, 12)).toISOString(),
    }));
    const withActivity = scoreProducts(catalog, clicks, Date.UTC(2026, 10, 11));
    const bf = getHoliday("black-friday")!;
    expect(holidayTop(bf, withActivity, 10, [])[0].id).toBe("kb1");
  });
});

describe("the series row follows the calendar", () => {
  it("puts the holiday on now first and the ones over last, each with its color and state", () => {
    const cards = buildSeries([], 8, {}, at("2026-12-05"));
    expect(cards.map((c) => c.href)).toEqual([
      "/deals/christmas-gifts",
      "/deals/new-year-setup",
      "/deals/thanksgiving-week",
      "/deals/black-friday",
      "/deals/cyber-monday",
    ]);
    expect(cards[0]).toMatchObject({ phase: "now", status: "On now" });
    expect(cards[0].theme?.accent).toBe(getHoliday("christmas-gifts")!.theme.accent);
    expect(cards[4]).toMatchObject({ phase: "ended", status: "Ended" });
  });

  it("before anything has ended it is calendar order", () => {
    expect(buildSeries([], 8, {}, at("2026-11-11")).map((c) => c.href)).toEqual(HOLIDAYS.map((h) => `/deals/${h.slug}`));
  });
});
