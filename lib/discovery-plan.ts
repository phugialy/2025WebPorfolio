// What the discovery engine should look for, and when. Pure logic: no database,
// no network, no "@/" imports, so it runs under Vitest with no setup. The
// Canopy search and the model call are wired in lib/market-intelligence.ts.
//
// The plan comes from docs/research/affiliate-market-outreach-2026-11-09.md
// (section 9): peak demand is Thanksgiving to Cyber Monday, December is
// forecast down, and the product types that carry the season are laptops,
// smartwatches, premium audio, creator microphones, mini PCs and monitors.
// Outside the holiday season the engine keeps its original behavior: one
// category a day from the standing list.
//
// Inside the season the plan is a hybrid of strategy and live ranking. The
// dated windows below are the strategy. Every 48 hours the rotate-deals cron
// re-evaluates it against live click data (a PlanSnapshot of per-category
// performance), and the order the day's targets are drawn in is a weighted
// shuffle: plan priority x live performance. A category that readers are
// opening more than its share of the catalog moves up; one that is not moves
// down; every target keeps a chance each period so nothing is starved.

const DAY_MS = 86_400_000;

/** Floor for a holiday-plan candidate, in US dollars. Set by the owner: nothing below $80. */
export const DISCOVERY_PRICE_FLOOR = 80;

/** flag_reason on a product the engine proposed. Cleared when an admin activates it. */
export const MARKET_SCAN_FLAG = "market-scan proposal";

/** Canopy searches one run may spend while the holiday plan is active. */
export const HOLIDAY_TARGETS_PER_RUN = 2;

export type DiscoveryFraming = "deal" | "price-rise";

export type DiscoveryTarget = {
  key: string;
  /** affiliate_products.category the product is filed under. Listed in lib/deals-core.ts SECTIONS, or it still reaches the holiday lists through the general fallback. */
  category: string;
  /** What Canopy is searched for (Amazon search language, not our taxonomy). */
  searchTerm: string;
  /** "price-rise": memory prices are climbing, so frame it as buy-before-prices-rise. */
  framing: DiscoveryFraming;
  /** What people type into Google for this product type, when that differs from the Amazon search (lib/demand-signal.ts measures it). */
  trendTerm?: string;
};

/** The term Google Trends is asked about for a target. */
export function trendTermOf(target: DiscoveryTarget): string {
  return (target.trendTerm ?? target.searchTerm).trim().toLowerCase();
}

/** Every term the demand signal measures, without the anchor. */
export function allTrendTerms(): string[] {
  return [...new Set(Object.values(DISCOVERY_TARGETS).map(trendTermOf))].filter((t) => t !== ANCHOR_TERM);
}

export const DISCOVERY_TARGETS: Record<string, DiscoveryTarget> = {
  laptops: { key: "laptops", category: "Laptops", searchTerm: "ultrabook laptop", framing: "price-rise", trendTerm: "laptop" },
  smartwatches: { key: "smartwatches", category: "Smartwatches", searchTerm: "smartwatch", framing: "deal" },
  headphones: { key: "headphones", category: "Audio", searchTerm: "noise cancelling headphones", framing: "deal", trendTerm: "headphones" },
  earbuds: { key: "earbuds", category: "Audio", searchTerm: "wireless earbuds noise cancelling", framing: "deal", trendTerm: "wireless earbuds" },
  "creator-mics": { key: "creator-mics", category: "Audio", searchTerm: "usb podcast microphone", framing: "deal", trendTerm: "podcast microphone" },
  "mini-pcs": { key: "mini-pcs", category: "AI Hardware", searchTerm: "mini pc", framing: "price-rise" },
  monitors: { key: "monitors", category: "Monitors", searchTerm: "4k monitor", framing: "deal" },
  phones: { key: "phones", category: "Phones", searchTerm: "unlocked smartphone", framing: "deal", trendTerm: "smartphone" },
  // Not tech, and not chosen to match the readers: well-known products that general
  // holiday shoppers buy. A proposal still waits for an admin to activate it.
  espresso: { key: "espresso", category: "Home & Kitchen", searchTerm: "espresso machine", framing: "deal" },
  "air-fryers": { key: "air-fryers", category: "Home & Kitchen", searchTerm: "air fryer", framing: "deal" },
  "robot-vacuums": { key: "robot-vacuums", category: "Home & Kitchen", searchTerm: "robot vacuum", framing: "deal" },
  luggage: { key: "luggage", category: "Travel", searchTerm: "carry on luggage", framing: "deal" },
  toothbrushes: { key: "toothbrushes", category: "Personal Care", searchTerm: "electric toothbrush", framing: "deal" },
  // For the New Year list's home-office focus.
  "standing-desks": { key: "standing-desks", category: "Desk Setup", searchTerm: "standing desk", framing: "deal" },
  "office-chairs": { key: "office-chairs", category: "Wellness & Ergonomics", searchTerm: "ergonomic office chair", framing: "deal" },
};

type PlanWindow = {
  /** Inclusive start, UTC midnight. */
  from: string;
  /** Exclusive end, UTC midnight. */
  to: string;
  /** Priority order. The window walks this list one step per day. */
  targets: string[];
};

// Windows follow the report's section 9 timetable. Dates are 2026 holiday season.
// Each window searches one to two weeks AHEAD of the holiday whose list it will
// feed (a found product is approved by an admin, then needs days to build up
// readers), so the targets lead with what the NEXT holiday's list focuses on
// (the `focus` of each holiday in lib/deals-core.ts HOLIDAYS), then the rest.
export const PLAN_WINDOWS: PlanWindow[] = [
  // Thanksgiving is on (Nov 26): its focus (home, travel, laptops, personal care), then Black Friday's first.
  { from: "2026-11-09", to: "2026-11-20", targets: ["espresso", "air-fryers", "luggage", "laptops", "robot-vacuums", "monitors", "headphones", "toothbrushes", "smartwatches", "mini-pcs", "earbuds", "creator-mics"] },
  // Black Friday (Nov 27) and Cyber Monday (Nov 30) are next: big-ticket first, then gadgets.
  { from: "2026-11-20", to: "2026-11-26", targets: ["laptops", "monitors", "headphones", "robot-vacuums", "smartwatches", "creator-mics", "mini-pcs", "earbuds", "espresso", "air-fryers", "toothbrushes", "luggage"] },
  // Thanksgiving, Black Friday, Cyber Monday (Nov 26, 27, 30). Christmas is next: gifts start to lead.
  { from: "2026-11-26", to: "2026-12-01", targets: ["laptops", "headphones", "monitors", "creator-mics", "smartwatches", "earbuds", "phones", "robot-vacuums", "air-fryers", "espresso", "toothbrushes"] },
  // Christmas (Dec 25): gifts. December is forecast down.
  { from: "2026-12-01", to: "2026-12-13", targets: ["headphones", "earbuds", "smartwatches", "toothbrushes", "espresso", "air-fryers", "luggage", "creator-mics", "laptops", "monitors", "robot-vacuums"] },
  // New Year (Jan 1) is next: home office and a fresh start.
  { from: "2026-12-13", to: "2027-01-03", targets: ["standing-desks", "office-chairs", "monitors", "robot-vacuums", "air-fryers", "toothbrushes", "laptops", "mini-pcs", "luggage", "headphones", "creator-mics"] },
];

import { ANCHOR_TERM } from "./demand-signal";
import { dayInEpoch, reevalEpoch, rotationKey } from "./rotation-core";

/** Live knowledge from the last re-evaluation. Written by rotate-deals, read here. */
export type PlanSnapshot = {
  /** The 48-hour period it was computed for (reevalEpoch). */
  epoch: number;
  computedAt: string;
  /** Per-category performance factors, 0.7x-1.5x. Empty when there was too little data. */
  factors: Record<string, number>;
};

export const DEMAND_FACTOR_MIN = 0.7;
export const DEMAND_FACTOR_MAX = 1.5;
/** Fewer measured targets than this and there is nothing sensible to compare against. */
export const DEMAND_MIN_TARGETS = 3;

/**
 * How much real-world search interest should lean on which product type the
 * engine searches Amazon for next. Each measured target's interest (a multiple
 * of laptop interest, lib/demand-signal.ts) is compared with the median of the
 * measured targets; the factor is the square root of that ratio, kept between
 * 0.7x and 1.5x so demand nudges the weighted shuffle and never decides it.
 * Targets nobody measured, and everything when too few were measured, get no
 * factor (they keep weight 1).
 */
export function demandFactors(targets: DiscoveryTarget[], ratios: Record<string, number> | null): Record<string, number> {
  if (!ratios) return {};
  const measured: { key: string; ratio: number }[] = [];
  for (const target of targets) {
    const term = trendTermOf(target);
    const ratio = term === ANCHOR_TERM ? 1 : ratios[term];
    if (typeof ratio === "number" && ratio > 0) measured.push({ key: target.key, ratio });
  }
  if (measured.length < DEMAND_MIN_TARGETS) return {};
  const sorted = measured.map((m) => m.ratio).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const out: Record<string, number> = {};
  for (const { key, ratio } of measured) {
    out[key] = Math.round(Math.min(DEMAND_FACTOR_MAX, Math.max(DEMAND_FACTOR_MIN, Math.sqrt(ratio / median))) * 100) / 100;
  }
  return out;
}

export function planWindowFor(now: number): PlanWindow | null {
  for (const w of PLAN_WINDOWS) {
    if (now >= Date.parse(`${w.from}T00:00:00Z`) && now < Date.parse(`${w.to}T00:00:00Z`)) return w;
  }
  return null;
}

export type DiscoveryPick = {
  mode: "holiday-plan" | "standing-rotation";
  targets: DiscoveryTarget[];
  /** Applies to every target in this pick. 0 means no floor (standing rotation). */
  priceFloor: number;
};

/**
 * The window's targets in the order this 48-hour period will visit them:
 * a weighted shuffle, seeded by the period, of the plan's priority
 * (first in the window's list weighs most) times the live category factor.
 * Stable for the whole period so the two days in it do not repeat a target.
 */
export function orderTargets(
  window: PlanWindow,
  snapshot: PlanSnapshot | null,
  epoch: number,
  demand: Record<string, number> | null = null
): DiscoveryTarget[] {
  const n = window.targets.length;
  return window.targets
    .map((key, index) => {
      const target = DISCOVERY_TARGETS[key];
      const priority = 1 + (n - index) / n; // 2.0 for the first, down toward 1.0
      const live = snapshot?.factors?.[target.category] ?? 1;
      const wanted = demand?.[key] ?? 1; // real-world search interest, see demandFactors
      return { target, rank: rotationKey(key, priority * live * wanted, epoch) };
    })
    .sort((a, b) => b.rank - a.rank)
    .map((entry) => entry.target);
}

/**
 * The targets for today's run. In a holiday window: HOLIDAY_TARGETS_PER_RUN
 * from this period's order (orderTargets), day one of the period taking the
 * first slots and day two the next. Otherwise: one category from
 * `standingCategories`, the original daily rotation.
 */
export function pickTargets(
  now: number,
  standingCategories: string[],
  snapshot: PlanSnapshot | null = null,
  demand: Record<string, number> | null = null
): DiscoveryPick {
  const window = planWindowFor(now);
  if (window) {
    const ordered = orderTargets(window, snapshot, reevalEpoch(now), demand);
    const count = Math.min(HOLIDAY_TARGETS_PER_RUN, ordered.length);
    const day = dayInEpoch(now);
    const targets: DiscoveryTarget[] = [];
    for (let i = 0; i < count; i += 1) targets.push(ordered[(day * count + i) % ordered.length]);
    return { mode: "holiday-plan", targets, priceFloor: DISCOVERY_PRICE_FLOOR };
  }

  const dayIndex = Math.floor(now / DAY_MS);
  const category = standingCategories[dayIndex % standingCategories.length];
  return {
    mode: "standing-rotation",
    targets: [{ key: `standing:${category}`, category, searchTerm: category, framing: "deal" }],
    priceFloor: 0,
  };
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

export type CandidatePrice = { value?: number | null; display?: string | null; currency?: string | null } | null | undefined;

/** The numeric USD price Canopy reported, or null when it reported none (or another currency). */
export function priceValue(price: CandidatePrice): number | null {
  if (!price || typeof price.value !== "number" || !Number.isFinite(price.value) || price.value <= 0) return null;
  if (price.currency && price.currency.toUpperCase() !== "USD") return null;
  return price.value;
}

/** Floor of 0 means "no floor". A missing price fails any real floor: we do not guess. */
export function meetsPriceFloor(price: CandidatePrice, floor: number): boolean {
  if (floor <= 0) return true;
  const value = priceValue(price);
  return value !== null && value >= floor;
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

/**
 * An admin activating a product the engine proposed is the review the flag was
 * waiting for. Left in place, the flag keeps the product off the Deals pages
 * and out of the guide engine's catalog even though it is live (the Deals
 * pages skip any product with a flag_reason). Only the engine's own flag is
 * cleared; any other flag (underperforming, compliance holds) is left alone.
 */
export function shouldClearProposalFlag(params: {
  previousStatus: string | undefined;
  nextStatus: string | undefined;
  previousFlagReason: string | null | undefined;
  flagReasonInUpdate: boolean;
}): boolean {
  if (params.flagReasonInUpdate) return false; // the caller already said what the flag should be
  return (
    params.previousStatus === "inactive" &&
    params.nextStatus === "active" &&
    params.previousFlagReason === MARKET_SCAN_FLAG
  );
}

// ---------------------------------------------------------------------------
// The product-fit prompt
// ---------------------------------------------------------------------------

export type FitPromptInput = {
  mode: DiscoveryPick["mode"];
  target: DiscoveryTarget;
  title: string;
  rating: number | null;
  ratingsTotal: number | null;
  price: number | null;
  /** Names already in the catalog in this category, so the model can avoid near-duplicates. */
  existingNames: string[];
};

export function buildFitPrompt(input: FitPromptInput): { system: string; user: string } {
  const common = `Respond with strict JSON only, no markdown fencing, no commentary outside the JSON: {"approved": boolean, "reasoning": string}. Keep "reasoning" to 1-2 sentences.`;

  if (input.mode === "standing-rotation") {
    return {
      system: `You screen affiliate product candidates for a practical AI, automation, and software-systems publication read by engineers, operators, and builders. You do not have price or description data -- reason from the title and category only, and say so in your reasoning rather than guessing a number.

Approve only if the product plausibly satisfies ALL of:
- Audience fit: a reader of AI/automation/dev-tools content and AI-hardware-accessory content would plausibly want this, not a generic unrelated household item that only matched the category keyword.
- Price tier: judging from the title/category conventions, this reads as an impulse-friendly purchase for someone reading an article, not a large planned purchase.
- Relevance durability: this looks like a durable, ongoing-useful product category, not a one-week fad or a seasonal novelty.
- Category saturation: this isn't the single most obvious, already-everywhere pick for this category (e.g. avoid rubber-stamping the single best-selling item every similar site already promotes) unless it's genuinely the right call.

${common}`,
      user: `Category: ${input.target.category}\nSearch keyword used: ${input.target.searchTerm}\nCandidate title: ${input.title}\nRating: ${input.rating ?? "unknown"} (${input.ratingsTotal ?? "unknown"} reviews)`,
    };
  }

  const framing =
    input.target.framing === "price-rise"
      ? "Memory and storage prices are rising, so this is a buy-before-prices-rise pick: a product people should consider now rather than in January."
      : "This is a holiday-season deal pick: a product shoppers are likely to buy during Thanksgiving to Cyber Monday week or as a gift.";

  const existing = input.existingNames.length
    ? `Already in our catalog for this category (avoid a near-duplicate of any of these):\n${input.existingNames.slice(0, 15).map((n) => `- ${n}`).join("\n")}`
    : "Nothing in our catalog yet for this category.";

  return {
    system: `You screen affiliate product candidates for a holiday shopping page. The shoppers are ordinary adults buying for themselves or as gifts during the holiday sales. The product can be any type: it does not need to relate to technology, AI or work. ${framing}

The price is real (from the Amazon listing today). Candidates are only considered at $${DISCOVERY_PRICE_FLOOR} or more.

Approve only if ALL of:
- Wanted: a general shopper would plausibly want this for daily life or as a gift, with real demand for this kind of product in the holiday sales.
- Recognisable and trustworthy: a known brand or a clearly established product line. Reject unbranded or generic listings, refurbished/renewed/used items, bundles padded with accessories, and "2027 Edition" style keyword-stuffed titles.
- Current and durable: a current-generation product, not discontinued or about to be replaced, and not a novelty.
- Not a near-duplicate of something already in our catalog.

You may mention the price in your reasoning (it is shown to the site admin only). Do not claim a discount or a "deal price": you do not know the list price.

${common}`,
    user: `Category: ${input.target.category}\nSearch keyword used: ${input.target.searchTerm}\nCandidate title: ${input.title}\nPrice: ${input.price !== null ? `$${input.price}` : "unknown"}\nRating: ${input.rating ?? "unknown"} (${input.ratingsTotal ?? "unknown"} reviews)\n\n${existing}`,
  };
}
