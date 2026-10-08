// Single source of truth for everything Ambit-specific. Every string a visitor
// sees about Ambit lives here so the whole set can be submitted to Ambit's
// Compliance Central as one reviewable unit and can't drift between placements.
//
// Constraints from Ambit's Independent Consultant Brand Guidelines (May 2026)
// that this copy is written to respect:
//   - Formal Ambit approval is required before any promotional material is
//     published -- this ships dormant (the vendor row stays status "inactive")
//     until the owner activates it after approval.
//   - No quoting rates, no guarantees, no promises, no compensation-plan
//     advertising. Copy invites ("see plans in your area"); it never claims.
//   - Only the Independent Consultant logo, unaltered (never the corporate or
//     Vistra logo; never mention Vistra).
//   - Texas-facing sites must show the REP's certified name and number.
//   - Always identify as an Independent Consultant, never as Ambit itself.

export const AMBIT_BRAND = "Ambit Energy";
export const AMBIT_CONSULTANT_NAME = "Phu Ly";
export const AMBIT_REP_LINE = "Ambit Texas, LLC REP #10117";
export const AMBIT_DISCLAIMER_URL = "https://goambit.com/disclaimer";
export const AMBIT_DISCLOSURE_PATH = "/disclosure#ambit";
export const AMBIT_LOGO_SRC = "/brand/ambit/ambit-independent-consultant-logo.svg";

// Ambit main orange (Pantone 1505, #F47920) per the guidelines' color page.
// A third-party brand color, deliberately a literal rather than a site token.
export const AMBIT_ORANGE = "#F47920";

// The one canonical headline/body, reused by every placement. The headline is
// the phrasing Ambit's own guidelines use in their approved sample customer
// posts ("Interested in reducing your monthly energy costs?").
export const AMBIT_COPY = {
  headline: "Interested in reducing your monthly energy costs?",
  body: "Plans and availability vary by address. Take a few minutes to see what Ambit Energy offers where you live. Enrollment happens on Phu Ly's Ambit page.",
  cta: "See plans in your area",
  sponsoredLabel: "Sponsored · Energy partner",
} as const;

export const AMBIT_DISCLAIMER_SHORT =
  "Important message regarding earnings: Ambit Energy makes no guarantee or promise of income or business. Anyone considering building a full-time or part-time Ambit business should have realistic expectations of their potential income.";

type NamedProduct = { brand?: string | null; name?: string | null };

export function isAmbitProduct(product: NamedProduct): boolean {
  const haystack = `${product.brand ?? ""} ${product.name ?? ""}`.toLowerCase();
  return haystack.includes("ambit energy");
}

// Always routed through the site's own redirect so every click is logged in
// affiliate_clicks. `ref` must match the label the matching impression is
// logged under, or CTR can't be computed for that placement.
export function ambitGoHref(productId: string, ref: string): string {
  return `/api/affiliate/go/${productId}?ref=${encodeURIComponent(ref)}`;
}

// Tier 1 -- consumer-intent terms: the article is about a household decision.
const CONSUMER_ENERGY_TERMS =
  /\b(electric(?:ity)?\s+(?:bills?|rates?|plans?|prices?|costs?)|utility\s+bills?|energy\s+bills?|power\s+bills?|home\s+energy|household\s+energy|smart\s+(?:home|thermostat)s?|thermostats?|heat\s+pumps?|hvac|home\s+solar|rooftop\s+solar|solar\s+panels?|home\s+charging|households?|homeowners?|renters?|cost\s+of\s+living|personal\s+finance|household\s+budgets?|family\s+budgets?|monthly\s+bills?|(?:save|saving)\s+money)\b/i;

// Tier 2 -- energy as the article's own subject. Today these are mostly AI
// power-demand pieces rather than household decisions, but a reader who just
// read about grid strain is a natural moment to offer "see plans where you
// live". Excludes chip-level "energy efficiency" and generic "data center"
// mentions (e.g. materials/semiconductor pieces) to avoid non sequiturs.
const ENERGY_TOPIC_TERMS =
  /\b(energy(?!\s+efficiency)|electricity|electric\s+(?:grid|power|utilit\w*)|power\s+grid|grid\s+(?:infrastructure|capacity|reliability|supply)|utilit(?:y|ies)|ratepayers?|power\s+(?:demand|supply|prices?|costs?|outages?|plants?)|data\s+cent(?:er|re)s?\s+(?:expansion|buildout|demand|power|energy|electric\w*))\b/i;

// Editorial override: tagging an article with any of these forces the callout
// on, so a relevant piece the regex misses never needs a code change.
const FORCE_TAGS = new Set([
  "ambit",
  "home energy",
  "household",
  "utilities",
  "utility bills",
  "energy bills",
]);

export function isEnergyHouseholdArticle(input: {
  title: string;
  tags?: string[] | null;
}): boolean {
  const tags = input.tags ?? [];
  if (tags.some((tag) => FORCE_TAGS.has(tag.trim().toLowerCase()))) {
    return true;
  }
  const text = `${input.title} ${tags.join(" ")}`;
  return CONSUMER_ENERGY_TERMS.test(text) || ENERGY_TOPIC_TERMS.test(text);
}
