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

/** Floor for a holiday-plan candidate, in US dollars. Set by the owner: $100+. */
export const DISCOVERY_PRICE_FLOOR = 100;

/** flag_reason on a product the engine proposed. Cleared when an admin activates it. */
export const MARKET_SCAN_FLAG = "market-scan proposal";

/** Canopy searches one run may spend while the holiday plan is active. */
export const HOLIDAY_TARGETS_PER_RUN = 2;

export type DiscoveryFraming = "deal" | "price-rise";

export type DiscoveryTarget = {
  key: string;
  /** affiliate_products.category the product is filed under. Must exist in lib/deals-core.ts SECTIONS to land on the Deals pages. */
  category: string;
  /** What Canopy is searched for (Amazon search language, not our taxonomy). */
  searchTerm: string;
  /** "price-rise": memory prices are climbing, so frame it as buy-before-prices-rise. */
  framing: DiscoveryFraming;
};

export const DISCOVERY_TARGETS: Record<string, DiscoveryTarget> = {
  laptops: { key: "laptops", category: "Laptops", searchTerm: "ultrabook laptop", framing: "price-rise" },
  smartwatches: { key: "smartwatches", category: "Smartwatches", searchTerm: "smartwatch", framing: "deal" },
  headphones: { key: "headphones", category: "Audio", searchTerm: "noise cancelling headphones", framing: "deal" },
  earbuds: { key: "earbuds", category: "Audio", searchTerm: "wireless earbuds noise cancelling", framing: "deal" },
  "creator-mics": { key: "creator-mics", category: "Audio", searchTerm: "usb podcast microphone", framing: "deal" },
  "mini-pcs": { key: "mini-pcs", category: "AI Hardware", searchTerm: "mini pc", framing: "price-rise" },
  monitors: { key: "monitors", category: "Monitors", searchTerm: "4k monitor", framing: "deal" },
  phones: { key: "phones", category: "Phones", searchTerm: "unlocked smartphone", framing: "deal" },
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
export const PLAN_WINDOWS: PlanWindow[] = [
  // Early sales are live; Best Buy's Black Friday run starts Nov 19.
  { from: "2026-11-09", to: "2026-11-20", targets: ["laptops", "smartwatches", "headphones", "creator-mics", "mini-pcs", "monitors", "earbuds"] },
  // Ramp before the peak.
  { from: "2026-11-20", to: "2026-11-26", targets: ["laptops", "headphones", "smartwatches", "earbuds", "mini-pcs", "monitors", "creator-mics"] },
  // Thanksgiving, Black Friday, Cyber Monday (Nov 26, 27, 30).
  { from: "2026-11-26", to: "2026-12-01", targets: ["laptops", "headphones", "smartwatches", "earbuds", "monitors", "creator-mics", "phones"] },
  // December is forecast down; gift-framed.
  { from: "2026-12-01", to: "2026-12-13", targets: ["headphones", "earbuds", "smartwatches", "laptops", "creator-mics", "monitors"] },
  // Light touch: new-year setup.
  { from: "2026-12-13", to: "2027-01-03", targets: ["monitors", "mini-pcs", "laptops", "creator-mics", "headphones"] },
];

const DAY_MS = 86_400_000;

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
 * The targets for today's run. In a holiday window: up to
 * HOLIDAY_TARGETS_PER_RUN consecutive entries of that window's priority list,
 * starting from the day's position in the window. Otherwise: one category from
 * `standingCategories`, the original daily rotation.
 */
export function pickTargets(now: number, standingCategories: string[]): DiscoveryPick {
  const window = planWindowFor(now);
  if (window) {
    const startMs = Date.parse(`${window.from}T00:00:00Z`);
    const dayInWindow = Math.floor((now - startMs) / DAY_MS);
    const keys = window.targets;
    const count = Math.min(HOLIDAY_TARGETS_PER_RUN, keys.length);
    const targets: DiscoveryTarget[] = [];
    for (let i = 0; i < count; i += 1) {
      const key = keys[(dayInWindow * count + i) % keys.length];
      targets.push(DISCOVERY_TARGETS[key]);
    }
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
    system: `You screen affiliate product candidates for a general-tech publication with an AI focus. Readers are builders, operators and everyday tech buyers shopping the holiday sales for gear that is actually useful: laptops, wearables, audio, microphones, mini PCs, monitors. ${framing}

The price is real (from the Amazon listing today). Candidates are only considered at $100 or more.

Approve only if ALL of:
- Audience fit: a tech-literate reader would want this for work, for daily use, or as a gift. AI-adjacent or workflow-relevant is a plus but not required.
- Recognisable and trustworthy: a known brand or a clearly established product line. Reject unbranded or generic listings, refurbished/renewed/used items, bundles padded with accessories, and "2027 Edition" style keyword-stuffed titles.
- Current and durable: a current-generation product, not discontinued or about to be replaced, and not a novelty.
- Not a near-duplicate of something already in our catalog.

You may mention the price in your reasoning (it is shown to the site admin only). Do not claim a discount or a "deal price": you do not know the list price.

${common}`,
    user: `Category: ${input.target.category}\nSearch keyword used: ${input.target.searchTerm}\nCandidate title: ${input.title}\nPrice: ${input.price !== null ? `$${input.price}` : "unknown"}\nRating: ${input.rating ?? "unknown"} (${input.ratingsTotal ?? "unknown"} reviews)\n\n${existing}`,
  };
}
