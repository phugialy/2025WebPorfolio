// How well a product fits a holiday, from evidence instead of a hand-written guess.
// Pure logic, no network: the Deals data loader passes in what it read.
//
// The score for one product on one holiday's list is a product of three readings
// and one editorial nudge:
//
//   seasonal lift   last year's Google Trends, this product type's interest inside
//                   the holiday's window divided by its own Sep-Oct level
//                   (SEASON_STUDY, measured once, see scripts/season-study.mjs)
//   demand          this year's interest in the product type against the other types
//                   we measure (lib/demand-signal.ts, kept 0.7x-1.5x)
//   trend           folded into demand: the demand signal already nudges the 3-month
//                   level by how the last 7 days run (blendDemand), so a type heating
//                   up this week is lifted without a second reading
//   focus           the holiday's hand-picked categories (HOLIDAYS[].focus): the
//                   editorial part no search chart can supply, mainly "is it a gift"
//
// What it is not: sales. Search interest says when people research a product type,
// not what is bought or gifted. Christmas in particular is a gifting holiday whose
// searching mostly happened in November, so its fit leans harder on the focus nudge.

import { ANCHOR_TERM } from "./demand-signal";

type Lifts = { thanksgiving: number; blackfriday: number; cybermonday: number; christmas: number; newyear: number };

export type SeasonTerm = {
  /** Mean Google interest Sep-Oct 2025 as a multiple of laptop interest. Small numbers are coarse. */
  level: number;
  /** Interest in each holiday window as a multiple of the same term's Sep-Oct mean. */
  lift: Lifts;
};

/**
 * Measured 2026-11-15 on US interest, 2025-09-01 to 2026-01-10 (5 searches).
 * Windows are last year's calendar equivalents of ours: Thanksgiving = Nov 1-27,
 * Black Friday = Nov 28-30, Cyber Monday = Dec 1-2, Christmas = Dec 3-25,
 * New Year = Dec 26-Jan 3. Two terms are left out because Google rounds them to
 * zero next to laptops and the ratios were noise (podcast microphone, ergonomic
 * office chair); they use the neutral lift of 1.
 */
export const SEASON_STUDY: Record<string, SeasonTerm> = {
  headphones: { level: 0.43, lift: { thanksgiving: 1.33, blackfriday: 2.4, cybermonday: 1.92, christmas: 1.54, newyear: 1.47 } },
  "wireless earbuds": { level: 0.02, lift: { thanksgiving: 3.74, blackfriday: 4.69, cybermonday: 3.91, christmas: 2.92, newyear: 1.74 } },
  smartwatch: { level: 0.04, lift: { thanksgiving: 1.68, blackfriday: 2.5, cybermonday: 2.14, christmas: 1.81, newyear: 1.78 } },
  smartphone: { level: 0.06, lift: { thanksgiving: 1.64, blackfriday: 3.03, cybermonday: 3.03, christmas: 2.23, newyear: 1.52 } },
  laptop: { level: 1, lift: { thanksgiving: 1.2, blackfriday: 1.6, cybermonday: 1.64, christmas: 1.15, newyear: 1.09 } },
  "4k monitor": { level: 0.02, lift: { thanksgiving: 2.04, blackfriday: 3.28, cybermonday: 2.46, christmas: 1.71, newyear: 1.64 } },
  // Measured 2026-11-15 against "4k monitor" (the laptop yardstick rounds it to zero): about a
  // quarter of 4k-monitor interest, so level ~0.005 of laptop. Small, but it spikes hardest of
  // all the monitor terms at Black Friday (4.5x).
  "curved gaming monitor": { level: 0.005, lift: { thanksgiving: 1.87, blackfriday: 4.55, cybermonday: 3.22, christmas: 2.26, newyear: 2.06 } },
  "mini pc": { level: 0.03, lift: { thanksgiving: 1.55, blackfriday: 2.14, cybermonday: 1.93, christmas: 1.31, newyear: 1.28 } },
  "mechanical keyboard": { level: 0.02, lift: { thanksgiving: 1.04, blackfriday: 2.0, cybermonday: 2.0, christmas: 1.09, newyear: 1.0 } },
  webcam: { level: 0.16, lift: { thanksgiving: 1.14, blackfriday: 1.47, cybermonday: 1.39, christmas: 1.38, newyear: 1.65 } },
  "external ssd": { level: 0.02, lift: { thanksgiving: 1.02, blackfriday: 2.03, cybermonday: 1.53, christmas: 1.02, newyear: 1.02 } },
  "espresso machine": { level: 0.09, lift: { thanksgiving: 1.66, blackfriday: 3.29, cybermonday: 2.41, christmas: 1.75, newyear: 2.1 } },
  "air fryer": { level: 0.58, lift: { thanksgiving: 1.16, blackfriday: 1.41, cybermonday: 1.19, christmas: 1.15, newyear: 1.37 } },
  "robot vacuum": { level: 0.04, lift: { thanksgiving: 1.58, blackfriday: 4.15, cybermonday: 2.58, christmas: 1.44, newyear: 1.67 } },
  "carry on luggage": { level: 0.04, lift: { thanksgiving: 1.17, blackfriday: 2.08, cybermonday: 1.68, christmas: 1.23, newyear: 1.33 } },
  "electric toothbrush": { level: 0.03, lift: { thanksgiving: 1.46, blackfriday: 2.39, cybermonday: 2.15, christmas: 1.44, newyear: 1.44 } },
  "standing desk": { level: 0.03, lift: { thanksgiving: 1.36, blackfriday: 1.53, cybermonday: 1.44, christmas: 1.08, newyear: 1.15 } },
  "gaming mouse": { level: 0.02, lift: { thanksgiving: 1.69, blackfriday: 2.86, cybermonday: 2.38, christmas: 1.95, newyear: 2.01 } },
};

/** Which catalog products a measured term stands for: a category, and optionally words in the name. */
export type TermRule = { term: string; categories: string[]; name?: RegExp };

// Most specific first: the first rule whose category matches (and name, when given) wins.
export const TERM_RULES: TermRule[] = [
  { term: "wireless earbuds", categories: ["Audio"], name: /ear\s?buds?|airpods|\bbuds\b|in-ear/i },
  { term: "headphones", categories: ["Audio"], name: /headphone|over-ear|on-ear|headset/i },
  { term: "headphones", categories: ["Audio"] }, // other audio (speakers, mics) leans on the nearest measured term
  { term: "smartwatch", categories: ["Smartwatches"] },
  { term: "smartphone", categories: ["Phones"] },
  { term: "laptop", categories: ["Laptops"] },
  { term: "curved gaming monitor", categories: ["Monitors"], name: /curved|ultra\s?wide|\b(1[6-9]\d|2[0-4]\d)\s?-?hz\b/i },
  { term: "4k monitor", categories: ["Monitors"] },
  { term: "mini pc", categories: ["AI Hardware"], name: /mini\s?pc|nuc|mac mini|mini computer/i },
  { term: "mechanical keyboard", categories: ["Keyboards"] },
  { term: "gaming mouse", categories: ["Input Devices"], name: /mouse|mice/i },
  { term: "webcam", categories: ["Webcams"] },
  { term: "external ssd", categories: ["Storage"] },
  { term: "espresso machine", categories: ["Home & Kitchen"], name: /espresso|coffee|latte|cappuccino/i },
  { term: "air fryer", categories: ["Home & Kitchen"], name: /air\s?fryer|fryer/i },
  { term: "robot vacuum", categories: ["Home & Kitchen"], name: /robot|vacuum|roomba|mop/i },
  { term: "carry on luggage", categories: ["Travel"] },
  { term: "electric toothbrush", categories: ["Personal Care"], name: /toothbrush|sonicare|oral-b|water flosser/i },
  { term: "standing desk", categories: ["Desk Setup"], name: /desk|standing/i },
];

export function termFor(product: { category: string | null; name?: string | null }): string | null {
  const category = product.category ?? "";
  for (const rule of TERM_RULES) {
    if (!rule.categories.includes(category)) continue;
    if (rule.name && !rule.name.test(product.name ?? "")) continue;
    return rule.term;
  }
  return null;
}

const LIFT_KEY: Record<string, keyof Lifts> = {
  "thanksgiving-week": "thanksgiving",
  "black-friday": "blackfriday",
  "cyber-monday": "cybermonday",
  "christmas-gifts": "christmas",
  "new-year-setup": "newyear",
};

export const LIFT_MIN = 0.8;
export const LIFT_MAX = 3;
/** A term this small next to laptops is whole-point rounded by Google, so its lift is trusted only halfway. */
const CONFIDENT_LEVEL = 0.05;

/**
 * A term's lift inside a holiday's window, pulled toward 1 when the term is too
 * small to read reliably and kept within LIFT_MIN..LIFT_MAX so one noisy spike
 * cannot decide a list. 1 when the term or holiday is unknown.
 */
export function seasonLift(term: string | null, holidaySlug: string, study: Record<string, SeasonTerm> = SEASON_STUDY): number {
  const key = LIFT_KEY[holidaySlug];
  const entry = term ? study[term] : undefined;
  if (!key || !entry) return 1;
  const confidence = Math.min(1, Math.max(0.5, entry.level / CONFIDENT_LEVEL));
  const lift = 1 + (entry.lift[key] - 1) * confidence;
  return Math.min(LIFT_MAX, Math.max(LIFT_MIN, lift));
}

export const DEMAND_NUDGE_MIN = 0.7;
export const DEMAND_NUDGE_MAX = 1.5;

/**
 * This year's interest in each product type, compared with the median of the types
 * measured: the square root of the ratio, kept within 0.7x-1.5x so demand leans on
 * the order and never decides it (same shape as the discovery engine's factors).
 * `ratios` is the blended demand (3-month level nudged by the last 7 days). The
 * laptop anchor is the yardstick and gets no nudge. Empty when fewer than three
 * terms were measured.
 */
export function demandNudges(ratios: Record<string, number> | null | undefined, minTerms = 3): Record<string, number> {
  if (!ratios) return {};
  const measured = Object.entries(ratios).filter(([term, r]) => term !== ANCHOR_TERM && typeof r === "number" && r > 0);
  if (measured.length < minTerms) return {};
  const sorted = measured.map(([, r]) => r).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const out: Record<string, number> = {};
  for (const [term, ratio] of measured) {
    out[term] = Math.round(Math.min(DEMAND_NUDGE_MAX, Math.max(DEMAND_NUDGE_MIN, Math.sqrt(ratio / median))) * 100) / 100;
  }
  return out;
}

// Strong enough that a holiday's own theme wins close calls (Cyber Monday stays
// gadgets and desk gear), weak enough that a type that spiked hard last year (a
// 4x robot vacuum) still earns a place beside it.
export const FOCUS_BOOST = 1.6;

export type FitParts = { term: string | null; lift: number; demand: number; focus: number; fit: number };

/** The fit of one product for one holiday, with the parts that made it. */
export function holidayFit(
  holiday: { slug: string; focus: readonly string[] },
  product: { category: string | null; name?: string | null },
  nudges: Record<string, number> = {}
): FitParts {
  const term = termFor(product);
  const lift = seasonLift(term, holiday.slug);
  const demand = term && typeof nudges[term] === "number" ? nudges[term] : 1;
  const focus = holiday.focus.includes(product.category ?? "") ? FOCUS_BOOST : 1;
  return { term, lift, demand, focus, fit: Math.round(lift * demand * focus * 1000) / 1000 };
}

/**
 * Fit rounded to quarter steps. Products in the same step keep rotating daily
 * (lib/deals-rotation.ts) so the list stays varied; a clearly better fit leads.
 */
export function fitBand(fit: number): number {
  return Math.round(fit * 4) / 4;
}
