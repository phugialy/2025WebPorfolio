import { describe, expect, it } from "vitest";
import {
  ROW_PLAN,
  THEMES,
  buildBlogRows,
  hash01,
  inTheme,
  postThemes,
  rotateOrder,
  trendingScore,
  type RowPost,
  type RowSlot,
} from "./blog-rows";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);

const post = (id: string, ageDays: number, extra: Partial<RowPost> & { views?: number } = {}): RowPost => {
  const { views, ...rest } = extra;
  return {
    _id: id,
    title: `Note ${id}`,
    slug: id,
    tags: [],
    createdAt: NOW - ageDays * DAY,
    publishDate: NOW - ageDays * DAY,
    metadata: { views: views ?? 0 },
    ...rest,
  };
};

describe("themes", () => {
  it("files notes under plain-language themes by title and tags", () => {
    expect(postThemes(post("a", 1, { title: "Medical AI Diagnostics Need Proof", tags: ["healthcare"] }))).toContain("health");
    expect(postThemes(post("b", 1, { title: "Enterprise AI Adoption", tags: ["workforce"] }))).toContain("business");
    expect(postThemes(post("c", 1, { title: "A Git hook for code review", tags: ["software"] }))).toContain("engineering");
    expect(postThemes(post("d", 1, { title: "Plain title", tags: [] }))).toEqual([]);
  });
  it("lets one note sit in several themes, and checks one theme by id", () => {
    const p = post("e", 1, { title: "AI Safety in Hospital Software" });
    expect(postThemes(p).sort()).toEqual(["engineering", "health", "policy"].sort());
    expect(inTheme(p, "health")).toBe(true);
    expect(inTheme(p, "science")).toBe(false);
    expect(inTheme(p, "nope")).toBe(false);
  });
});

describe("rotation", () => {
  it("hash01 stays strictly between 0 and 1 and is stable", () => {
    for (const s of ["", "a", "business", "9:health"]) {
      const h = hash01(s);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(1);
      expect(hash01(s)).toBe(h);
    }
  });
  it("gives the same order inside one time bucket and changes between buckets", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const order = (bucket: number) => rotateOrder(ids, (x) => x, () => 1, bucket).join("");
    expect(order(7)).toBe(order(7));
    const seen = new Set(Array.from({ length: 12 }, (_, b) => order(b)));
    expect(seen.size).toBeGreaterThan(4);
  });
  it("puts a heavier item first more often", () => {
    const ids = ["heavy", "light1", "light2", "light3"];
    let heavyFirst = 0;
    for (let b = 0; b < 400; b++) {
      if (rotateOrder(ids, (x) => x, (x) => (x === "heavy" ? 9 : 1), b)[0] === "heavy") heavyFirst++;
    }
    expect(heavyFirst).toBeGreaterThan(160);
    expect(heavyFirst).toBeLessThan(380);
  });
});

describe("trending score", () => {
  it("is views per day, with age floored at two days", () => {
    expect(trendingScore(post("a", 10, { views: 100 }), NOW)).toBeCloseTo(10);
    expect(trendingScore(post("b", 0.1, { views: 100 }), NOW)).toBeCloseTo(50);
  });
});

describe("the row plan", () => {
  const fresh = Array.from({ length: 6 }, (_, i) => post(`n${i}`, 0.2 + i * 0.2)); // within 48 hours
  const week = Array.from({ length: 5 }, (_, i) => post(`w${i}`, 3 + i * 0.5)); // within a week
  const old = Array.from({ length: 6 }, (_, i) => post(`o${i}`, 60 + i * 5, { views: 100 * (i + 1) }));
  const all = [...fresh, ...week, ...old];
  const slot = (kind: RowSlot["kind"]) => ROW_PLAN.find((s) => s.kind === kind);

  it("has two new rows first, then trending, then most read, then the topic rows", () => {
    expect(ROW_PLAN.map((s) => s.kind)).toEqual(["new", "new", "trending", "most-read", "themes"]);
    expect(slot("themes")).toBeDefined();
  });

  it("builds Just in, then New this week without repeating Just in", () => {
    const rows = buildBlogRows(all, { now: NOW });
    expect(rows[0]).toMatchObject({ id: "just-in", kind: "new" });
    expect(rows[0].posts.map((p) => p._id)).toEqual(fresh.map((p) => p._id));
    expect(rows[1]).toMatchObject({ id: "this-week", kind: "new" });
    expect(rows[1].posts.map((p) => p._id)).toEqual(week.map((p) => p._id));
  });

  it("leaves out the excluded top story everywhere", () => {
    const rows = buildBlogRows(all, { now: NOW, excludeIds: ["n0"] });
    expect(rows.flatMap((r) => r.posts.map((p) => p._id))).not.toContain("n0");
  });

  it("falls back to the latest notes when nothing is new, so the top never empties", () => {
    const rows = buildBlogRows(old, { now: NOW });
    expect(rows[0].id).toBe("just-in");
    expect(rows[0].posts.length).toBeGreaterThanOrEqual(4);
  });

  it("ranks Most read by total views, not by date", () => {
    const rows = buildBlogRows(all, { now: NOW });
    const most = rows.find((r) => r.id === "most-read");
    expect(most?.posts[0]._id).toBe("o5");
  });

  it("only trends notes from the trend window, fastest first", () => {
    const recent = [post("t1", 5, { views: 50 }), post("t2", 6, { views: 300 }), post("t3", 9, { views: 20 }), post("t4", 20, { views: 40 })];
    const plan: RowSlot[] = [{ kind: "trending", id: "trending", title: "Trending now", blurb: "", windowDays: 30, cap: 12 }];
    const rows = buildBlogRows([...recent, post("ancient", 200, { views: 9999 })], { now: NOW, plan });
    expect(rows[0].kind).toBe("trending");
    expect(rows[0].posts.map((p) => p._id)).toEqual(["t2", "t1", "t3", "t4"]);
  });

  it("shows a note from an earlier row at the back of a later row, never at the front", () => {
    const a = [post("a1", 0.5, { views: 90 }), post("a2", 0.6, { views: 80 }), post("a3", 0.7, { views: 70 }), post("a4", 0.8, { views: 60 })];
    const b = [post("b1", 20, { views: 500 }), post("b2", 21, { views: 400 }), post("b3", 22, { views: 300 })];
    const rows = buildBlogRows([...a, ...b], { now: NOW });
    const trending = rows.find((r) => r.id === "trending");
    expect(trending?.posts.slice(0, 3).map((p) => p._id).sort()).toEqual(["b1", "b2", "b3"].sort());
    expect(trending?.posts.slice(3).map((p) => p._id)).toEqual(["a1", "a2", "a3", "a4"]);
  });

  it("makes theme rows only for themes with enough notes, capped in size", () => {
    const biz = Array.from({ length: 30 }, (_, i) => post(`biz${i}`, 20 + i, { title: `Enterprise adoption study ${i}` }));
    const health = [post("h1", 25, { title: "Clinical AI trial" }), post("h2", 26, { title: "Drug discovery AI" })];
    const rows = buildBlogRows([...biz, ...health], { now: NOW });
    const themeRows = rows.filter((r) => r.kind === "theme");
    expect(themeRows.map((r) => r.themeId)).toEqual(["business"]);
    expect(themeRows[0].posts).toHaveLength(16);
  });

  it("rotates topic rows between days but holds still within a day", () => {
    const mixed = THEMES.flatMap((t, ti) =>
      Array.from({ length: 5 }, (_, i) => post(`${t.id}${i}`, 30 + ti + i, { title: `${t.title} note`, tags: [t.id === "engineering" ? "software" : t.title.split(" ")[0].toLowerCase()] }))
    );
    const order = (offsetDays: number) => buildBlogRows(mixed, { now: NOW + offsetDays * DAY }).filter((r) => r.kind === "theme").map((r) => r.themeId).join(",");
    expect(order(0)).toBe(order(0));
    expect(new Set(Array.from({ length: 8 }, (_, d) => order(d))).size).toBeGreaterThan(2);
  });

  it("puts everything not shown in a final More stories row", () => {
    const lonely = Array.from({ length: 30 }, (_, i) => post(`x${i}`, 100 + i, { title: "Plain title" }));
    const rows = buildBlogRows(lonely, { now: NOW });
    const more = rows[rows.length - 1];
    expect(more.kind).toBe("more");
    expect(more.posts.length).toBeLessThanOrEqual(16);
  });
});
