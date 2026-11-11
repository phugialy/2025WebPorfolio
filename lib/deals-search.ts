// Deals search that never ends on a dead page. Pure functions, no imports from
// the server, so the same code runs in the browser today and behind a ledger API
// later (see docs/decisions/deals-search-fallback.md).
//
// A search answers in three tiers:
//   exact  every word the shopper typed is in the product's name, category, tags or reason
//   close  the words match through related words (earbuds -> headphones), or most of them match
//   none   nothing relevant; the page offers the products we would put in front of
//          anyone instead, and the search is recorded as an unmet request
//
// Within a tier, products are ordered by relevance and then by "pull": how likely a
// shopper is to click it. Pull is the part that says what makes a product attractive
// enough to act on, and it is built only from things a shopper can see.

import { hasProductImage } from "./product-images";
import { purchaseSize } from "./deals-size";
import type { ExplorerItem } from "./deals-core";

export type SearchTier = "exact" | "close" | "none";

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

// Words that carry no product meaning in a shopping search.
const STOPWORDS = new Set([
  "a", "an", "and", "any", "best", "better", "for", "good", "great", "i", "in", "is", "it", "me", "my", "need", "new",
  "of", "on", "or", "some", "something", "that", "the", "to", "top", "want", "with", "your",
]);

// Groups of words a shopper treats as the same thing. A word matches every other
// word in its group, at a lower weight than a direct hit. Built from what the
// catalog actually stocks; add a group when the search log shows a repeated miss.
const SYNONYM_GROUPS: string[][] = [
  ["headphone", "earbud", "earphone", "headset", "airpod"],
  ["monitor", "screen", "display", "ultrawide"],
  ["keyboard", "keycap", "typing"],
  ["mouse", "mice", "trackball"],
  ["webcam", "camera", "cam"],
  ["pc", "computer", "desktop"],
  ["laptop", "notebook"],
  ["dock", "docking", "hub", "adapter"],
  ["desk", "standing"],
  ["ssd", "storage", "drive", "disk"],
  ["book", "reading", "read", "handbook"],
  ["ai", "llm", "ml", "agentic", "intelligence"],
  ["gpu", "graphics", "nvidia", "rtx", "geforce"],
  ["tablet", "drawing", "wacom", "pen", "huion"],
  ["charger", "cable", "power", "charging"],
  ["ergonomic", "ergo", "vertical", "wrist", "comfort", "posture"],
  ["gift", "present", "christmas", "holiday"],
  ["streaming", "stream", "meeting", "zoom", "video"],
];

const SYNONYMS = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const set = SYNONYMS.get(word) ?? new Set<string>();
    for (const other of group) if (other !== word) set.add(other);
    SYNONYMS.set(word, set);
  }
}

// Lowercase, drop punctuation, and cut a plural "s" so "headphones" and
// "headphone" are the same word. Numbers and short model words such as "4k" stay.
export function stem(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function searchTerms(query: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of query.toLowerCase().split(/\s+/)) {
    const w = stem(raw);
    if (!w || STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pull: what makes a product attractive enough to click
// ---------------------------------------------------------------------------

// Each part is something a shopper can see on the card. Weights add to 1.
export const PULL_WEIGHTS = {
  photo: 0.25, // a real product picture; most people buy on the picture
  reason: 0.2, // one line on who it is for ("buy if...")
  activity: 0.25, // other shoppers opened it recently
  label: 0.1, // Trending or New, which is earned, never decoration
  size: 0.1, // a clear purchase size (small, mid, big) so the cost of acting is known
  guide: 0.1, // a guide page backs it up
} as const;

export type PullPart = keyof typeof PULL_WEIGHTS;

export function pullParts(item: ExplorerItem, hasGuide = false): Record<PullPart, number> {
  return {
    photo: hasProductImage(item.image_url) ? 1 : 0,
    reason: (item.hook ?? item.buy_if ?? "").trim().length >= 12 ? 1 : 0,
    // Browsers in the last 7 days, flattened so one hot product cannot bury the rest.
    activity: Math.min(1, Math.log2(1 + Math.max(0, item.score)) / 3),
    label: item.badge ? 1 : 0,
    size: purchaseSize(item) ? 1 : 0,
    guide: hasGuide ? 1 : 0,
  };
}

export function pullScore(item: ExplorerItem, hasGuide = false): number {
  const parts = pullParts(item, hasGuide);
  let total = 0;
  for (const key of Object.keys(PULL_WEIGHTS) as PullPart[]) total += PULL_WEIGHTS[key] * parts[key];
  return total;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type SearchHit = {
  item: ExplorerItem;
  relevance: number; // 0..1
  pull: number; // 0..1
  matched: string[]; // search words that matched directly
  related: Array<{ typed: string; found: string }>; // search words that matched through a related word
};

export type SearchResult = {
  tier: SearchTier;
  terms: string[];
  hits: SearchHit[];
  // Shown when the tier is "none": the products worth offering to anyone.
  suggestions: SearchHit[];
};

// Where a word is found counts for more the closer it is to what the product is.
const FIELD_WEIGHT = { name: 1, category: 0.75, tags: 0.5, reason: 0.4 } as const;
const RELATED_FACTOR = 0.6;
export const SUGGESTION_COUNT = 6;
const MAX_PER_SECTION_IN_SUGGESTIONS = 2;
const MAX_PER_SIZE_IN_SUGGESTIONS = 3;

const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function fieldsOf(item: ExplorerItem) {
  return {
    name: wordsOf(item.name),
    category: wordsOf(item.category ?? ""),
    tags: wordsOf(item.tags.join(" ")),
    reason: wordsOf(`${item.hook ?? ""} ${item.buy_if ?? ""}`),
  };
}

// Best field a word lands in, 0 when it is nowhere. A word matches from the start
// of a word, so "ai" finds "AI" and "AI-powered" but not "training", and "headphone"
// finds "headphones".
function bestField(fields: ReturnType<typeof fieldsOf>, word: string): number {
  let best = 0;
  for (const key of Object.keys(FIELD_WEIGHT) as Array<keyof typeof FIELD_WEIGHT>) {
    if (FIELD_WEIGHT[key] > best && fields[key].some((w) => w.startsWith(word))) best = FIELD_WEIGHT[key];
  }
  return best;
}

function scoreItem(item: ExplorerItem, terms: string[], hasGuide: boolean): SearchHit & { all: boolean; share: number } {
  const fields = fieldsOf(item);
  const matched: string[] = [];
  const related: Array<{ typed: string; found: string }> = [];
  let sum = 0;
  for (const term of terms) {
    const direct = bestField(fields, term);
    if (direct > 0) {
      sum += direct;
      matched.push(term);
      continue;
    }
    let bestRelated = 0;
    let via = "";
    for (const alt of SYNONYMS.get(term) ?? []) {
      const w = bestField(fields, alt);
      if (w > bestRelated) {
        bestRelated = w;
        via = alt;
      }
    }
    if (bestRelated > 0) {
      sum += bestRelated * RELATED_FACTOR;
      related.push({ typed: term, found: via });
    }
  }
  const covered = matched.length + related.length;
  return {
    item,
    relevance: terms.length ? sum / terms.length : 0,
    pull: pullScore(item, hasGuide),
    matched,
    related,
    all: covered === terms.length,
    share: terms.length ? covered / terms.length : 0,
  };
}

// Relevance leads; pull orders products that are about equally relevant and lifts
// the ones a shopper is more likely to act on.
const order = (a: SearchHit, b: SearchHit) =>
  b.relevance * (0.6 + 0.4 * b.pull) - a.relevance * (0.6 + 0.4 * a.pull) || b.pull - a.pull || a.item.name.localeCompare(b.item.name);

// The products worth showing someone whose search found nothing: the most
// attractive across the catalog, at most two from any one section and three of any
// one size, so it is neither ten keyboards nor six small add-ons.
export function suggest(items: ExplorerItem[], guideIds: ReadonlySet<string> = new Set()): SearchHit[] {
  const ranked = items
    .map((item) => ({ item, relevance: 0, pull: pullScore(item, guideIds.has(item.id)), matched: [], related: [] }) as SearchHit)
    .sort((a, b) => b.pull - a.pull || b.item.score - a.item.score || a.item.name.localeCompare(b.item.name));
  const perSection = new Map<string, number>();
  const perSize = new Map<string, number>();
  const out: SearchHit[] = [];
  for (const hit of ranked) {
    const used = perSection.get(hit.item.section) ?? 0;
    const size = purchaseSize(hit.item) ?? "unlabeled";
    const usedSize = perSize.get(size) ?? 0;
    if (used >= MAX_PER_SECTION_IN_SUGGESTIONS || (size !== "unlabeled" && usedSize >= MAX_PER_SIZE_IN_SUGGESTIONS)) continue;
    perSection.set(hit.item.section, used + 1);
    perSize.set(size, usedSize + 1);
    out.push(hit);
    if (out.length >= SUGGESTION_COUNT) break;
  }
  return out;
}

export function searchDeals(items: ExplorerItem[], query: string, guideIds: ReadonlySet<string> = new Set()): SearchResult {
  const terms = searchTerms(query);
  if (terms.length === 0) return { tier: "none", terms, hits: [], suggestions: suggest(items, guideIds) };

  const scored = items.map((item) => scoreItem(item, terms, guideIds.has(item.id))).filter((h) => h.relevance > 0);
  const direct = scored.filter((h) => h.matched.length === terms.length).sort(order);
  if (direct.length > 0) return { tier: "exact", terms, hits: direct, suggestions: [] };

  // Close: every word matched at least through a related word, or most of the words matched.
  const close = scored.filter((h) => h.all || h.share >= 0.5).sort(order);
  if (close.length > 0) return { tier: "close", terms, hits: close, suggestions: [] };

  return { tier: "none", terms, hits: [], suggestions: suggest(items, guideIds) };
}

// A one-line reason a result is shown, in the shopper's words.
export function whyShown(hit: SearchHit): string | null {
  if (hit.related.length > 0) {
    const r = hit.related[0];
    return `Matched "${r.found}" for "${r.typed}"`;
  }
  return null;
}
