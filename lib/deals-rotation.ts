// How the Deals pages rotate what they show. Pure logic: no database, no
// network, no "@/" imports, so it runs under Vitest with no setup.
//
// Before this, every list was ordered by the last 7 days of clicks with ties
// broken alphabetically. Whatever was already popular stayed on top, and a
// product with no clicks yet (every new product, including the ones the
// discovery engine finds) could never reach a visitor. Now each list keeps a
// few anchors (the products readers really do open most) and fills the rest
// from a weighted shuffle that changes once a day, on a schedule, with a cron
// (app/api/cron/rotate-deals) warming the new lineup at the boundary.
//
// The weight of a product is a hybrid of live ranking and strategy:
//   (1 + sqrt(recent clicks))   the product's own momentum, tempered so one busy product does not own the page
//   x category performance      live: is this category earning more or less than its share of the catalog? (0.7x to 1.5x)
//   x freshness                 up to 2x for a newly activated product, fading to 1x over 14 days
//   x plan                      strategy: 1.5x when its category is a priority in today's holiday plan
// A heavier product is more likely to be early, never guaranteed; a quiet one can still surface.

import { DISCOVERY_TARGETS, planWindowFor, type PlanSnapshot } from "./discovery-plan";
import { ROTATION_HOURS, ROTATION_OFFSET_HOURS, reevalEpoch, rotationBucket, rotationKey, rotationStart } from "./rotation-core";

export type { PlanSnapshot };
export { ROTATION_HOURS, ROTATION_OFFSET_HOURS, rotationBucket, rotationKey, rotationStart };

const HOUR = 3_600_000;

export const FRESH_DAYS = 14;
export const FRESH_MAX_MULTIPLIER = 2;
export const PLAN_MULTIPLIER = 1.5;
/** How many of the current plan window's first targets count as priorities. */
export const PLAN_PRIORITY_COUNT = 4;

/** Below this many recent clicks in total, category performance is noise and no factor is applied. */
export const MIN_SIGNAL_CLICKS = 30;
export const FACTOR_MIN = 0.7;
export const FACTOR_MAX = 1.5;

/** Every category the discovery plan chases at any point in the season. */
export const STRATEGY_CATEGORIES: ReadonlySet<string> = new Set(Object.values(DISCOVERY_TARGETS).map((t) => t.category));

/** Categories the holiday plan is prioritizing today. Empty outside the season. */
export function planCategories(now: number): Set<string> {
  const window = planWindowFor(now);
  if (!window) return new Set();
  return new Set(window.targets.slice(0, PLAN_PRIORITY_COUNT).map((key) => DISCOVERY_TARGETS[key].category));
}

export type RotationInput = {
  id: string;
  /** Recent human clicks, as scoreProducts counts them. */
  score: number;
  category: string | null;
  /** When the product was added to the catalog. Missing means "not fresh". */
  created_at?: string | null;
};

export function freshnessMultiplier(createdAt: string | null | undefined, now: number): number {
  if (!createdAt) return 1;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return 1;
  const ageDays = (now - created) / (24 * HOUR);
  if (ageDays < 0 || ageDays >= FRESH_DAYS) return 1;
  return 1 + (FRESH_MAX_MULTIPLIER - 1) * (1 - ageDays / FRESH_DAYS);
}

/**
 * Live category performance: a category's share of recent clicks divided by its
 * share of the catalog. 1 means it earns its share; above 1 it over-performs.
 * Bounded to 0.7x-1.5x so one week of data can nudge the strategy but never
 * flip it. Returns {} (no opinion) when there is too little data to trust.
 * Only categories that have products can appear, so a category the plan
 * wants but the catalog does not carry yet is judged by the plan alone.
 *
 * `only` limits which categories get a factor (shares are still measured
 * against the whole catalog). Clicks cannot tell a $12 cable from a $900
 * laptop, and on real data the cheap categories (cleaning spray, cables,
 * tumblers) hit the 1.5x cap on a handful of clicks, which would have steered
 * the page away from the $100+ strategy. So live factors are applied only to
 * the categories the plan chases (STRATEGY_CATEGORIES).
 */
export function categoryFactors(
  products: { category: string | null; score: number }[],
  options: { only?: ReadonlySet<string> } = {}
): Record<string, number> {
  const total = products.reduce((n, p) => n + Math.max(0, p.score), 0);
  if (total < MIN_SIGNAL_CLICKS || products.length === 0) return {};
  const byCategory = new Map<string, { count: number; score: number }>();
  for (const p of products) {
    if (!p.category) continue;
    const entry = byCategory.get(p.category) ?? { count: 0, score: 0 };
    entry.count += 1;
    entry.score += Math.max(0, p.score);
    byCategory.set(p.category, entry);
  }
  const factors: Record<string, number> = {};
  for (const [category, { count, score }] of byCategory) {
    if (options.only && !options.only.has(category)) continue;
    const ratio = score / total / (count / products.length);
    factors[category] = Math.round(Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, ratio)) * 100) / 100;
  }
  return factors;
}

export function buildPlanSnapshot(products: { category: string | null; score: number }[], now: number): PlanSnapshot {
  return { epoch: reevalEpoch(now), computedAt: new Date(now).toISOString(), factors: categoryFactors(products) };
}

export function displayWeight(
  input: RotationInput,
  now: number,
  plan: Set<string>,
  factors: Record<string, number> = {}
): number {
  const momentum = 1 + Math.sqrt(Math.max(0, input.score));
  const planBoost = input.category && plan.has(input.category) ? PLAN_MULTIPLIER : 1;
  const live = (input.category && factors[input.category]) || 1;
  return momentum * live * freshnessMultiplier(input.created_at, now) * planBoost;
}

/** Keys for a whole catalog. Returns an empty map when rotation is switched off. */
export function rotationKeys(
  products: RotationInput[],
  now: number,
  options: { enabled?: boolean; factors?: Record<string, number> } = {}
): Map<string, number> {
  const keys = new Map<string, number>();
  if (options.enabled === false) return keys;
  const bucket = rotationBucket(now);
  const plan = planCategories(now);
  for (const p of products) keys.set(p.id, rotationKey(p.id, displayWeight(p, now, plan, options.factors), bucket));
  return keys;
}
