// The temporary non-tech product test on the Deals pages: the rules the daily
// job follows. Pure logic: no database, no network, so it runs under Vitest.
// The job itself is lib/deals-test-run.ts; the decision record is
// docs/decisions/deals-non-tech-test.md.
//
// The idea: put a small, rotating set of non-tech products ($80+, any type) on
// the Deals shelves for the rest of the season, give them enough exposure to be
// read, and keep the ones readers open at least as often as the rest.
//
// Our traffic is small (about 165 shelf impressions on a busy day, a median
// product sees 3 in ten days), so the cycle is set from our own volume: a
// product stays until it could have been seen about MIN_READ_IMPRESSIONS times.
// Real-world demand (lib/demand-signal.ts) decides which product type gets the
// next free slot, with diminishing returns so no type fills the shelf.

import { daysBetween, dealsToday } from "./deals-core";
import { DISCOVERY_TARGETS, trendTermOf } from "./discovery-plan";

export const TEST_FROM = "2026-11-12";
export const TEST_TO = "2027-01-03";
export const TEST_TAG = "deals-test";
export const RETIRED_FLAG = "deals-test retired";

/** The non-tech product types under test. A proposal in any other category is left for a human. */
export const TEST_CATEGORIES = ["Home & Kitchen", "Personal Care", "Travel", "Wellness & Ergonomics"] as const;

export const MAX_ACTIVE = 12; // on the shelves at once
export const MAX_PER_CATEGORY = 4;
export const MAX_ACTIVATIONS_PER_DAY = 3;
export const MAX_PROPOSAL_AGE_DAYS = 30;

/** Impressions a product should have collected before it is judged. */
export const MIN_READ_IMPRESSIONS = 30;
export const MIN_LIFE_DAYS = 7;
export const DEFAULT_LIFE_DAYS = 14; // also how long the rotation's "new" boost lasts
export const MAX_LIFE_DAYS = 21;

/** The test runs inside its window and until someone sets DEALS_TEST=off. */
export function testActive(now: number, flag: string | undefined): boolean {
  if ((flag ?? "").trim().toLowerCase() === "off") return false;
  const today = dealsToday(now);
  return today >= TEST_FROM && today <= TEST_TO;
}

/**
 * How long a product stays on the shelf. Thin traffic means a longer stay, so
 * each product can still collect enough impressions to be read; plenty of
 * traffic shortens it. Always between a week and three weeks.
 */
export function shelfLifeDays(avgImpressionsPerProductDay: number | null): number {
  if (avgImpressionsPerProductDay === null || !(avgImpressionsPerProductDay > 0)) return DEFAULT_LIFE_DAYS;
  const days = Math.ceil(MIN_READ_IMPRESSIONS / avgImpressionsPerProductDay);
  return Math.min(MAX_LIFE_DAYS, Math.max(MIN_LIFE_DAYS, days));
}

/** The Trends search terms for each test category, from the discovery targets. */
export function termsByCategory(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const category of TEST_CATEGORIES) out[category] = [];
  for (const target of Object.values(DISCOVERY_TARGETS)) {
    if ((TEST_CATEGORIES as readonly string[]).includes(target.category)) out[target.category].push(trendTermOf(target));
  }
  return out;
}

export type ActiveTest = {
  id: string;
  category: string | null;
  /** The day it went on the shelf (YYYY-MM-DD). */
  activatedDay: string;
  /** Deals impressions and clicks since then. */
  impressions: number;
  clicks: number;
};

export type Proposal = {
  id: string;
  name: string;
  category: string | null;
  createdAt: string;
  hasImage: boolean;
  /** The link carries our Associate tag. */
  hasTag: boolean;
};

export type PlanInput = {
  today: string;
  active: ActiveTest[];
  proposals: Proposal[];
  /** Everything else on the Deals shelves over the recent past. */
  baseline: { impressions: number; clicks: number };
  /** Category -> real-world demand (a multiple of the anchor term). Null when there is no signal. */
  demand: Record<string, number> | null;
  avgImpressionsPerProductDay: number | null;
  hidden?: string[];
};

export type Plan = {
  lifeDays: number;
  retire: { id: string; category: string | null; reason: string }[];
  graduate: { id: string; category: string | null; reason: string }[];
  activate: { id: string; name: string; category: string }[];
  keep: number;
  notes: string[];
};

const ctr = (clicks: number, impressions: number) => (impressions > 0 ? clicks / impressions : null);
const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);

export function planDay(input: PlanInput): Plan {
  const lifeDays = shelfLifeDays(input.avgImpressionsPerProductDay);
  const notes: string[] = [];
  const retire: Plan["retire"] = [];
  const graduate: Plan["graduate"] = [];
  const kept: ActiveTest[] = [];
  const baseline = ctr(input.baseline.clicks, input.baseline.impressions);

  for (const product of input.active) {
    const age = daysBetween(product.activatedDay, input.today);
    const own = ctr(product.clicks, product.impressions);
    const facts = `${age}d on shelf, ${product.impressions} impressions, ${product.clicks} clicks (${pct(own)}) vs ${pct(baseline)} for the rest`;
    if (age >= lifeDays) {
      const earned = product.impressions >= MIN_READ_IMPRESSIONS && own !== null && baseline !== null && own >= baseline;
      (earned ? graduate : retire).push({ id: product.id, category: product.category, reason: `${earned ? "earned a place" : "life over"}: ${facts}` });
    } else if (age >= MIN_LIFE_DAYS && product.impressions === 0) {
      retire.push({ id: product.id, category: product.category, reason: `never shown: ${facts}` });
    } else {
      kept.push(product);
    }
  }

  const perCategory = new Map<string, number>();
  for (const product of kept) if (product.category) perCategory.set(product.category, (perCategory.get(product.category) ?? 0) + 1);

  const hidden = new Set(input.hidden ?? []);
  const eligible = input.proposals
    .filter((p) => p.category && (TEST_CATEGORIES as readonly string[]).includes(p.category))
    .filter((p) => p.hasImage && p.hasTag && !hidden.has(p.id))
    .filter((p) => daysBetween(p.createdAt.slice(0, 10), input.today) <= MAX_PROPOSAL_AGE_DAYS)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const pool = new Map<string, Proposal[]>();
  for (const p of eligible) pool.set(p.category as string, [...(pool.get(p.category as string) ?? []), p]);

  const activate: Plan["activate"] = [];
  const freeSlots = Math.max(0, MAX_ACTIVE - kept.length);
  const toFill = Math.min(freeSlots, MAX_ACTIVATIONS_PER_DAY);
  for (let i = 0; i < toFill; i++) {
    const open = TEST_CATEGORIES.filter((c) => (perCategory.get(c) ?? 0) < MAX_PER_CATEGORY && (pool.get(c)?.length ?? 0) > 0);
    if (open.length === 0) break;
    // Demand decides, with diminishing returns: the next slot goes to the type
    // with the most demand per product it already holds. With no demand signal
    // every type counts the same, which keeps the shelf evenly spread.
    const score = (c: string) => (input.demand?.[c] ?? 1) / (1 + (perCategory.get(c) ?? 0));
    const category = open.reduce((best, c) => (score(c) > score(best) ? c : best), open[0]);
    const next = pool.get(category)!.shift()!;
    perCategory.set(category, (perCategory.get(category) ?? 0) + 1);
    activate.push({ id: next.id, name: next.name, category });
  }

  if (freeSlots === 0) notes.push(`shelf full (${MAX_ACTIVE})`);
  else if (activate.length === 0) notes.push(eligible.length === 0 ? "no eligible proposals waiting" : "no free slot in a category with proposals");
  if (!input.demand) notes.push("no real-world demand signal: slots spread evenly");
  return { lifeDays, retire, graduate, activate, keep: kept.length, notes };
}
