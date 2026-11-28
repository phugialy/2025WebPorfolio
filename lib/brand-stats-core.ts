// The Insta360 brand page's numbers, from the two first-party logs the page
// writes to: a product card on screen (affiliate_impressions) and an outbound
// click (affiliate_clicks), both labelled with the page's ref. Pure, so the
// rules are tested without a database.
//
// Rules, the same ones every Deals read-out uses:
// - bots are already left out by the query (is_bot);
// - a "sweeper" is a browser that opened 8 or more different products on one
//   day anywhere on the site (a link checker or a scraper, not a shopper); its
//   clicks are dropped and counted separately;
// - read nothing into a card with fewer than 30 views (MIN_VIEWS).

export const SWEEPER_PRODUCTS_PER_DAY = 8;
export const MIN_VIEWS = 30;

export type ImpressionRow = { product_id: string | null; created_at: string };
export type ClickRow = { product_id: string | null; article_slug: string | null; user_agent: string | null; created_at: string };
export type CardGroup = "camera" | "accessory";
export type CardInfo = { name: string; group: CardGroup };

export type CardStat = { id: string; name: string; group: CardGroup; seen: number; opened: number; ctr: number | null; enoughViews: boolean };
export type GroupStat = { seen: number; opened: number; ctr: number | null };
export type DayStat = { day: string; seen: number; opened: number };
export type BrandWindow = {
  seen: number;
  opened: number;
  ctr: number | null;
  sweeperClicksDropped: number;
  groups: Record<CardGroup, GroupStat>;
  cards: CardStat[];
  days: DayStat[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ratio = (opened: number, seen: number) => (seen > 0 ? opened / seen : null);
const dayOf = (iso: string) => iso.slice(0, 10);

/** "user agent|day" keys of browsers that opened SWEEPER_PRODUCTS_PER_DAY or more products that day, site-wide. */
export function sweeperKeys(allHumanClicks: ClickRow[]): Set<string> {
  const products = new Map<string, Set<string>>();
  for (const click of allHumanClicks) {
    if (!click.product_id) continue;
    const key = `${click.user_agent ?? ""}|${dayOf(click.created_at)}`;
    if (!products.has(key)) products.set(key, new Set());
    products.get(key)!.add(click.product_id);
  }
  return new Set([...products].filter(([, ids]) => ids.size >= SWEEPER_PRODUCTS_PER_DAY).map(([key]) => key));
}

export function summarizeBrandPage(input: {
  ref: string;
  impressions: ImpressionRow[]; // this page's, bots already removed
  allHumanClicks: ClickRow[]; // site-wide, bots removed: needed to spot sweepers
  cards: Map<string, CardInfo>;
  since: number;
  now: number;
}): BrandWindow {
  const { ref, cards, since, now } = input;
  const inWindow = (iso: string) => new Date(iso).getTime() >= since;
  const sweepers = sweeperKeys(input.allHumanClicks.filter((c) => inWindow(c.created_at)));

  const seen = new Map<string, number>();
  const opened = new Map<string, number>();
  const byDay = new Map<string, { seen: number; opened: number }>();
  const touchDay = (day: string) => {
    if (!byDay.has(day)) byDay.set(day, { seen: 0, opened: 0 });
    return byDay.get(day)!;
  };

  for (const row of input.impressions) {
    if (!row.product_id || !inWindow(row.created_at)) continue;
    seen.set(row.product_id, (seen.get(row.product_id) ?? 0) + 1);
    touchDay(dayOf(row.created_at)).seen += 1;
  }

  let sweeperClicksDropped = 0;
  for (const click of input.allHumanClicks) {
    if (click.article_slug !== ref || !click.product_id || !inWindow(click.created_at)) continue;
    if (sweepers.has(`${click.user_agent ?? ""}|${dayOf(click.created_at)}`)) {
      sweeperClicksDropped += 1;
      continue;
    }
    opened.set(click.product_id, (opened.get(click.product_id) ?? 0) + 1);
    touchDay(dayOf(click.created_at)).opened += 1;
  }

  const cardStats: CardStat[] = [...cards.entries()]
    .map(([id, info]) => {
      const s = seen.get(id) ?? 0;
      const o = opened.get(id) ?? 0;
      return { id, name: info.name, group: info.group, seen: s, opened: o, ctr: ratio(o, s), enoughViews: s >= MIN_VIEWS };
    })
    .sort((a, b) => b.opened - a.opened || b.seen - a.seen || a.name.localeCompare(b.name));

  const group = (g: CardGroup): GroupStat => {
    const list = cardStats.filter((c) => c.group === g);
    const s = list.reduce((n, c) => n + c.seen, 0);
    const o = list.reduce((n, c) => n + c.opened, 0);
    return { seen: s, opened: o, ctr: ratio(o, s) };
  };

  // Every day in the window, oldest first, including the quiet ones.
  const days: DayStat[] = [];
  for (let t = since; t <= now; t += DAY_MS) {
    const day = dayOf(new Date(t).toISOString());
    if (days.length && days[days.length - 1].day === day) continue;
    days.push({ day, ...(byDay.get(day) ?? { seen: 0, opened: 0 }) });
  }

  const totalSeen = cardStats.reduce((n, c) => n + c.seen, 0);
  const totalOpened = cardStats.reduce((n, c) => n + c.opened, 0);
  return {
    seen: totalSeen,
    opened: totalOpened,
    ctr: ratio(totalOpened, totalSeen),
    sweeperClicksDropped,
    groups: { camera: group("camera"), accessory: group("accessory") },
    cards: cardStats,
    days,
  };
}
