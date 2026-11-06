// Rows for the blog index: what to show, in what order, and how it rotates.
// Pure logic with no imports so it can be unit tested and edited in one place.
// Nothing here talks to the database or the publishing pipeline: it only reads
// fields every article already has (title, tags, publish date, views).

export type RowPost = {
  _id: string;
  title: string;
  slug: string;
  tags?: string[];
  publishDate?: number;
  createdAt: number;
  metadata?: { views?: number };
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const postTime = (p: RowPost): number => p.publishDate ?? p.createdAt;
const viewsOf = (p: RowPost): number => p.metadata?.views ?? 0;

// ---------------------------------------------------------------------------
// Themes: plain-language groups, worked out from the title and tags
// ---------------------------------------------------------------------------

export type Theme = { id: string; title: string; blurb: string; pattern: RegExp };

export const THEMES: Theme[] = [
  {
    id: "business",
    title: "Business and work",
    blurb: "Enterprise AI, adoption, jobs, finance and markets.",
    pattern:
      /\b(business(es)?|enterprise|markets?|financ\w*|bank\w*|econom\w*|startups?|customers?|sales|revenue|workforce|jobs?|labor|employ\w*|procurement|retail|commerce|pricing|insurance|adoption|invest\w*)\b/i,
  },
  {
    id: "engineering",
    title: "Engineering and software",
    blurb: "Agents, code, infrastructure and the tools builders use.",
    pattern:
      /\b(software|coding|code|developers?|engineering|programming|devops|frameworks?|compiler\w*|open source|SRE|agents?|agentic|infrastructure|LLMs?|machine learning|benchmarks?|API)\b/i,
  },
  {
    id: "health",
    title: "Health and bio sciences",
    blurb: "Medical AI, drug discovery, genomics and diagnostics.",
    pattern:
      /\b(health\w*|medical|medicine|clinical|patients?|hospitals?|drugs?|pharma\w*|proteins?|genom\w*|biolog\w*|biotech\w*|cancer|disease|diagnos\w*|radiolog\w*|life sciences?)\b/i,
  },
  {
    id: "policy",
    title: "Policy, safety and society",
    blurb: "Safety, regulation, privacy, copyright and trust.",
    pattern:
      /\b(polic(y|ies)|regulat\w*|laws?|legal|governance|ethic\w*|safety|privacy|security|copyright|government\w*|bias\w*|fairness|misinformation|alignment|trust|compliance|liabilit\w*)\b/i,
  },
  {
    id: "devices",
    title: "Robotics, chips and devices",
    blurb: "Hardware, data centers, robots and networks.",
    pattern:
      /\b(robot\w*|chips?|gpus?|hardware|semiconductor\w*|sensors?|drones?|vehicles?|autonomous|edge|devices?|data cent(er|re)s?|wearables?|5G|6G|networks?|silicon)\b/i,
  },
  {
    id: "science",
    title: "Science and climate",
    blurb: "Energy, climate, materials, space and the physical world.",
    pattern:
      /\b(climate|energy|physics|chemi\w*|materials?|quantum|astronom\w*|space|weather|ocean\w*|satellite\w*|batter(y|ies)|agricultur\w*|environment\w*|carbon|emissions?|water|geolog\w*|math\w*)\b/i,
  },
];

const textOf = (p: RowPost) => `${p.title} ${(p.tags ?? []).join(" ")}`;

export function postThemes(p: RowPost): string[] {
  const text = textOf(p);
  return THEMES.filter((t) => t.pattern.test(text)).map((t) => t.id);
}

export function inTheme(p: RowPost, themeId: string): boolean {
  const theme = THEMES.find((t) => t.id === themeId);
  return Boolean(theme && theme.pattern.test(textOf(p)));
}

// ---------------------------------------------------------------------------
// The row plan. Edit this list to change the page: order, windows, sizes.
// ---------------------------------------------------------------------------

export type RowSlot =
  | { kind: "new"; id: string; title: string; blurb: string; windowHours: number; cap: number; minItems: number }
  | { kind: "trending"; id: string; title: string; blurb: string; windowDays: number; cap: number }
  | { kind: "most-read"; id: string; title: string; blurb: string; cap: number }
  | { kind: "themes"; cap: number; maxRows: number; rotateEveryHours: number; recentDays: number };

export const ROW_PLAN: RowSlot[] = [
  { kind: "new", id: "just-in", title: "Just in", blurb: "Published in the last two days.", windowHours: 48, cap: 12, minItems: 4 },
  { kind: "new", id: "this-week", title: "New this week", blurb: "The rest of this week's notes.", windowHours: 7 * 24, cap: 16, minItems: 3 },
  { kind: "trending", id: "trending", title: "Trending now", blurb: "Recent notes that are being read the fastest.", windowDays: 30, cap: 12 },
  { kind: "most-read", id: "most-read", title: "Most read", blurb: "The notes readers open the most, all time.", cap: 12 },
  // Topic rows. Their order is shuffled every `rotateEveryHours`, weighted (by the square root of recent notes, so one busy
  // topic does not always win) toward topics with more notes in the last `recentDays`.
  { kind: "themes", cap: 16, maxRows: 6, rotateEveryHours: 24, recentDays: 14 },
];

export const MORE_ROW_CAP = 16;
const MIN_THEME_ITEMS = 3;

// ---------------------------------------------------------------------------
// Scores and rotation
// ---------------------------------------------------------------------------

// Views per day since publishing (age floored at two days so a note that is a
// few hours old does not look unbeatable). Views are cumulative, so this is a
// proxy for "being read fast", not a count of reads in the last day.
export function trendingScore(p: RowPost, now: number): number {
  const ageDays = Math.max(2, (now - postTime(p)) / DAY);
  return viewsOf(p) / ageDays;
}

// 32-bit FNV-1a hash mapped to the open interval (0, 1).
export function hash01(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) + 1) / (0xffffffff + 2);
}

// Weighted shuffle that holds still inside one time bucket and changes between
// buckets: order by u^(1/weight), highest first, where u comes from the bucket
// and the item id. A bigger weight pushes an item toward the front on average.
export function rotateOrder<T>(items: T[], idOf: (t: T) => string, weightOf: (t: T) => number, bucket: number): T[] {
  return items
    .map((item) => ({ item, key: Math.pow(hash01(`${bucket}:${idOf(item)}`), 1 / Math.max(0.1, weightOf(item))) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}

// ---------------------------------------------------------------------------
// Building the rows
// ---------------------------------------------------------------------------

export type BlogRow<P extends RowPost = RowPost> = {
  id: string;
  kind: "new" | "trending" | "most-read" | "theme" | "more";
  title: string;
  blurb: string;
  themeId?: string;
  posts: P[];
};

export function buildBlogRows<P extends RowPost>(
  posts: P[],
  options: { now?: number; plan?: RowSlot[]; excludeIds?: string[] } = {}
): BlogRow<P>[] {
  const now = options.now ?? Date.now();
  const plan = options.plan ?? ROW_PLAN;
  const excluded = new Set(options.excludeIds ?? []);
  const pool = posts.filter((p) => !excluded.has(p._id)).sort((a, b) => postTime(b) - postTime(a));
  const seen = new Set<string>();
  const rows: BlogRow<P>[] = [];

  // Items not shown in an earlier row come first, then repeats; each group keeps its order.
  const freshFirst = (list: P[], cap: number) =>
    [...list.filter((p) => !seen.has(p._id)), ...list.filter((p) => seen.has(p._id))].slice(0, cap);
  const push = (row: BlogRow<P>) => {
    rows.push(row);
    row.posts.forEach((p) => seen.add(p._id));
  };

  let firstNew = true;
  for (const slot of plan) {
    if (slot.kind === "new") {
      const since = now - slot.windowHours * HOUR;
      let list = pool.filter((p) => postTime(p) >= since && !seen.has(p._id));
      // A quiet stretch must not empty the top of the page: the first "new" row falls back to the latest notes.
      if (firstNew && list.length < slot.minItems) list = pool.filter((p) => !seen.has(p._id)).slice(0, 8);
      firstNew = false;
      if (list.length >= slot.minItems) push({ id: slot.id, kind: "new", title: slot.title, blurb: slot.blurb, posts: list.slice(0, slot.cap) });
    } else if (slot.kind === "trending") {
      const since = now - slot.windowDays * DAY;
      const list = pool
        .filter((p) => postTime(p) >= since && viewsOf(p) > 0)
        .sort((a, b) => trendingScore(b, now) - trendingScore(a, now) || postTime(b) - postTime(a));
      if (list.length >= MIN_THEME_ITEMS) push({ id: slot.id, kind: "trending", title: slot.title, blurb: slot.blurb, posts: freshFirst(list, slot.cap) });
    } else if (slot.kind === "most-read") {
      const list = pool.filter((p) => viewsOf(p) > 0).sort((a, b) => viewsOf(b) - viewsOf(a) || postTime(b) - postTime(a));
      if (list.length >= MIN_THEME_ITEMS) push({ id: slot.id, kind: "most-read", title: slot.title, blurb: slot.blurb, posts: freshFirst(list, slot.cap) });
    } else {
      const recentSince = now - slot.recentDays * DAY;
      const bucket = Math.floor(now / (slot.rotateEveryHours * HOUR));
      const themed = THEMES.map((theme) => {
        const members = pool.filter((p) => theme.pattern.test(textOf(p)));
        return { theme, members, recent: members.filter((p) => postTime(p) >= recentSince).length };
      }).filter((t) => t.members.length >= MIN_THEME_ITEMS);
      const ordered = rotateOrder(themed, (t) => t.theme.id, (t) => Math.sqrt(1 + t.recent), bucket).slice(0, slot.maxRows);
      for (const { theme, members } of ordered) {
        push({ id: theme.id, kind: "theme", title: theme.title, blurb: theme.blurb, themeId: theme.id, posts: freshFirst(members, slot.cap) });
      }
    }
  }

  const rest = pool.filter((p) => !seen.has(p._id)).slice(0, MORE_ROW_CAP);
  if (rest.length > 0) rows.push({ id: "more", kind: "more", title: "More notes", blurb: "Everything else, newest first.", posts: rest });
  return rows;
}
