// Whether two Amazon product titles are the same product in different colours or
// pack wording. Pure logic, no imports.
//
// Amazon gives every colour of a product its own ASIN and listing, so the same
// toothbrush came up three times (White, Black, Pink) and went on the Deals pages
// twice. Matching by link cannot see that; matching by name can: same brand, same
// model number, and nearly the same words once colours and filler are removed.
// Different models of one brand (a C28 and a C20 robot vacuum) stay different.

const COLORS = new Set([
  "black", "white", "pink", "blue", "silver", "gray", "grey", "red", "green", "navy", "ivory", "gold",
  "purple", "beige", "cerulean", "champagne", "bone", "brown", "orange", "yellow", "teal", "rose",
  "graphite", "midnight", "cream", "charcoal", "lavender", "mint", "coral", "bronze",
]);
const FILLER = new Set([
  "the", "and", "with", "for", "from", "pack", "set", "new", "edition", "amazon", "exclusive", "only",
  "by", "of", "in", "a", "an", "to", "your", "kit", "count", "pcs", "piece", "inch", "style",
]);

/** The words that identify a product: lowercase, no punctuation, no colours or filler, singular. */
export function nameTokens(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0 && !COLORS.has(t) && !FILLER.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
  return [...new Set(tokens)];
}

const firstWord = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/)[0] ?? "";
// A model number: letters and digits together ("c28", "io9") or a plain number of
// four or more digits ("5900"). Not a small count ("2") or a fragment of a
// thousands-separated number ("15,000" splits into "15" and "000").
const modelTokens = (tokens: string[]) =>
  tokens.filter((t) => (/[a-z]/.test(t) && /\d/.test(t) && t.length >= 2) || /^\d{4,}$/.test(t));

export const DUPLICATE_SIMILARITY = 0.6;

export function isNearDuplicate(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length < 2 || tb.length < 2) return false;
  if (firstWord(a) !== firstWord(b)) return false;
  const sa = new Set(ta);
  const sb = new Set(tb);
  const ma = modelTokens(ta);
  const mb = modelTokens(tb);
  // Two different model numbers are two different products, however alike the words.
  if (ma.length > 0 && mb.length > 0 && !ma.some((t) => sb.has(t))) return false;
  const shared = ta.filter((t) => sb.has(t)).length;
  const union = new Set([...sa, ...sb]).size;
  return shared / union >= DUPLICATE_SIMILARITY;
}

/** The first name in `others` that `name` duplicates, or undefined. */
export function findNearDuplicate(name: string, others: readonly string[]): string | undefined {
  return others.find((other) => isNearDuplicate(name, other));
}
