// Pure logic for the temporary Deals section (/deals and /deals/<holiday>).
// No database, no network, no "@/" imports, so it runs under Vitest with no
// setup. The server wiring is in lib/deals.ts.

import { purchaseSize, type PurchaseSize } from "./deals-size";
import { hasProductImage } from "./product-images";

export const DEALS_TAG = "holiday-guide"; // articles carrying this tag appear in the Deals section
export const DEALS_STARTS_AT = Date.parse("2026-11-01T00:00:00Z");
// After this the section redirects to /resources and the nav item, strip and links disappear.
export const DEALS_ENDS_AT = Date.parse("2027-01-03T00:00:00Z");

// Holiday buying guides are written for the Deals section and must stay out of
// the Articles section (blog index, home, topics, RSS, related and recent
// lists). A guide is any article carrying DEALS_TAG; it is still reachable at
// its own /blog/<slug> address and is listed under /deals.
export function isDealsGuide(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).some((tag) => tag.trim().toLowerCase() === DEALS_TAG);
}

export function withoutDealsGuides<T extends { tags: readonly string[] | null | undefined }>(rows: T[]): T[] {
  return rows.filter((row) => !isDealsGuide(row.tags));
}

// The sentence every guide must contain (the Deals pages use the same words).
export const DEALS_DISCLOSURE_SENTENCE =
  "We earn from qualifying purchases made through these links, at no extra cost to you, as an Amazon Associate and through other affiliate programs.";

export function isDealsActive(now: number = Date.now()): boolean {
  return now >= DEALS_STARTS_AT && now < DEALS_ENDS_AT;
}

// Hand controls. Ids are affiliate_products.id values. Pins show first on every
// list that includes them (in this order); hides never appear anywhere here.
export const DEALS_PINS: string[] = [];
export const DEALS_HIDES: string[] = [
  "cb5793d4-53a7-4952-b618-24d3abcc1393", // duplicate of the 2084 book listed under AI Engineering
  // Held back after the 2026-11-05 research pass, until each is confirmed or fixed in the catalog:
  "53d33449-8877-47cd-ac70-39de26615e5d", // NVIDIA Jetson Xavier NX kit: NVIDIA lists it end of life
  "3f554da3-3791-4748-8e57-a989d0f2171f", // "Claude Code Mastery": no book with this title found
  "24e555dc-0954-4b05-875b-3475debf0c4a", // The Agentic AI Bible: almost no independent reviews
  "7b264c53-3b8e-46e7-b35b-2e5f6e23bb34", // GMKtec EVO-T2S: listing and ASIN not verified
  "705597c0-fab2-495b-8440-8a30c9797b7c", // Hands-On ML: link is the 2019 second edition
];

// Catalog entries filed under the wrong category in the product data. Applied
// only for the Deals pages, so the main catalog is not changed. Fix the
// category in /admin/affiliate to make these permanent, then remove the entry.
export const DEALS_CATEGORY_OVERRIDES: Record<string, string> = {
  "26056ab1-9d30-41ed-ae7e-e44f147ef860": "Books", // AI: Understand the Revolution (a book)
  "8f939346-63f0-4671-bbe0-91063b4ce927": "Books", // AI... Meets... AI (a children's book)
  "62850da2-5ca7-4a80-b0b9-8e2afe517a9b": "Books", // The Hardware Hacking Handbook (a book)
  "4b2ee344-8406-471e-ad7c-950a711b340d": "Input Devices", // VSD M18 macro pad
};

export function applyCategoryOverrides<T extends { id: string; category: string | null }>(
  products: T[],
  overrides: Record<string, string> = DEALS_CATEGORY_OVERRIDES
): T[] {
  return products.map((p) => (overrides[p.id] ? { ...p, category: overrides[p.id] } : p));
}

// Books are not part of the Deals pages (owner decision, 2026-11-05): they are
// kept off the catalog, the Top 10 lists and the trending row. Apply this AFTER
// applyCategoryOverrides, which re-files a few products as Books.
export function dropBooks<T extends { category: string | null }>(products: T[]): T[] {
  return products.filter((p) => sectionSlugFor(p.category) !== "books");
}

export const TRENDING_WINDOW_DAYS = 7;
export const MIN_TRENDING_SCORE = 3; // recent activity needed to be labeled "Trending"
export const TOP_OVERALL = 8;
export const PER_SECTION = 4;
export const TOP_N = 10; // "Top 10" lists

// ---------------------------------------------------------------------------
// Catalog shapes
// ---------------------------------------------------------------------------

export type DealsProduct = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  description: string | null;
  buy_if: string | null;
  skip_if?: string | null;
  is_partner: boolean;
  flag_reason: string | null;
  // From the dedicated deals_catalog table (see attachCatalog). Absent on a
  // plain catalog row.
  tags?: string[];
  pinned_rank?: number | null;
  // When the product joined the catalog. Newly added products get a boost in
  // the daily rotation (lib/deals-rotation.ts).
  created_at?: string | null;
  // Card facts from deals_product_facts (see normalizeFacts). Null or absent
  // until the holiday guide engine has filled them in for this product.
  facts?: ProductFacts | null;
};

// ---------------------------------------------------------------------------
// Card facts
// ---------------------------------------------------------------------------

// Whether the coarse price class (value / mainstream / premium) is shown on
// cards. Off until the owner decides: Amazon allows exact prices and review
// ratings only from its own API with a timestamp, and a class derived from a
// scraped price is a gray area worth a deliberate yes.
export const SHOW_PRICE_CLASS = false;

export type PriceClass = "value" | "mainstream" | "premium";
export type Verdict = "recommended" | "recommended_with_caveats" | "not_enough_evidence";
export type Confidence = "high" | "medium" | "low";

export type ProductFacts = {
  whatItIs: string | null;
  bestFor: string | null;
  buyIf: string | null;
  skipIf: string | null;
  strengths: string[];
  caveats: string[];
  keySpecs: string[];
  priceClass: PriceClass | null;
  verdict: Verdict | null;
  confidence: Confidence | null;
  evidenceCount: number | null;
  evidenceNewest: string | null; // YYYY-MM-DD
  verifiedAt: string | null;
  guideSlug: string | null;
};

export type FactsRow = {
  product_id: string;
  what_it_is?: string | null;
  best_for?: string | null;
  buy_if?: string | null;
  skip_if?: string | null;
  strengths?: string[] | null;
  caveats?: string[] | null;
  key_specs?: string[] | null;
  price_class?: string | null;
  verdict?: string | null;
  confidence?: string | null;
  evidence_count?: number | null;
  evidence_newest?: string | null;
  verified_at?: string | null;
  guide_slug?: string | null;
};

// Card limits. The scan layer of a card has to be readable in a few seconds, so
// each field is capped; anything longer belongs in the guide.
export const FACT_LIMITS = { line: 140, bestFor: 80, reason: 200, item: 90, strengths: 3, caveats: 2, specs: 4 } as const;

const PRICE_CLASSES: readonly string[] = ["value", "mainstream", "premium"];
const VERDICTS: readonly string[] = ["recommended", "recommended_with_caveats", "not_enough_evidence"];
const CONFIDENCES: readonly string[] = ["high", "medium", "low"];

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function cleanList(value: unknown, count: number, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = cleanText(item, max);
    if (text) out.push(text);
    if (out.length === count) break;
  }
  return out;
}

// Turns a database row into a safe card payload: trims, caps lengths and counts,
// and drops unknown enum values. A row with nothing usable returns null so the
// card falls back to the product's own text.
export function normalizeFacts(row: FactsRow | null | undefined): ProductFacts | null {
  if (!row) return null;
  const newest = typeof row.evidence_newest === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.evidence_newest) ? row.evidence_newest.slice(0, 10) : null;
  const facts: ProductFacts = {
    whatItIs: cleanText(row.what_it_is, FACT_LIMITS.line),
    bestFor: cleanText(row.best_for, FACT_LIMITS.bestFor),
    buyIf: cleanText(row.buy_if, FACT_LIMITS.reason),
    skipIf: cleanText(row.skip_if, FACT_LIMITS.reason),
    strengths: cleanList(row.strengths, FACT_LIMITS.strengths, FACT_LIMITS.item),
    caveats: cleanList(row.caveats, FACT_LIMITS.caveats, FACT_LIMITS.item),
    keySpecs: cleanList(row.key_specs, FACT_LIMITS.specs, 40),
    priceClass: row.price_class && PRICE_CLASSES.includes(row.price_class) ? (row.price_class as PriceClass) : null,
    verdict: row.verdict && VERDICTS.includes(row.verdict) ? (row.verdict as Verdict) : null,
    confidence: row.confidence && CONFIDENCES.includes(row.confidence) ? (row.confidence as Confidence) : null,
    evidenceCount: typeof row.evidence_count === "number" && row.evidence_count >= 0 ? Math.floor(row.evidence_count) : null,
    evidenceNewest: newest,
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    guideSlug: cleanText(row.guide_slug, 200),
  };
  const useful =
    facts.whatItIs || facts.bestFor || facts.buyIf || facts.skipIf || facts.strengths.length || facts.caveats.length || facts.keySpecs.length || facts.verdict;
  return useful ? facts : null;
}

export function attachFacts<T extends { id: string }>(products: T[], rows: FactsRow[] | null): (T & { facts: ProductFacts | null })[] {
  const byId = new Map<string, ProductFacts>();
  for (const row of rows ?? []) {
    const facts = normalizeFacts(row);
    if (facts) byId.set(row.product_id, facts);
  }
  return products.map((p) => ({ ...p, facts: byId.get(p.id) ?? null }));
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  recommended: "Recommended",
  recommended_with_caveats: "Recommended, with caveats",
  not_enough_evidence: "Not enough evidence yet",
};

export const PRICE_CLASS_LABEL: Record<PriceClass, { mark: string; text: string }> = {
  value: { mark: "$", text: "Value for its type" },
  mainstream: { mark: "$$", text: "Mid-range for its type" },
  premium: { mark: "$$$", text: "Premium for its type" },
};

export type ClickRow = { product_id: string | null; user_agent: string | null; created_at: string };

export type ScoredProduct = DealsProduct & {
  score: number; // distinct (browser, day) pairs in the last 7 days
  previous: number; // the same for the 7 days before
  rising: boolean;
  // This period's rotation key (lib/deals-rotation.ts); higher shows earlier.
  // Absent or 0 means rotation is off, and ordering is by activity alone.
  rotation?: number;
};

// Shopping groups. Categories not listed fall into "More picks". Order here is
// only a tiebreaker: groups sort by recent activity on the hub page.
export const SECTIONS: { slug: string; title: string; blurb: string; categories: string[] }[] = [
  {
    slug: "ai-computing",
    title: "AI and local computing",
    blurb: "Mini PCs, developer boards and storage for running AI models at home.",
    categories: ["AI Hardware", "Storage"],
  },
  {
    slug: "books",
    title: "Books for builders",
    blurb: "Reading for people building with AI.",
    categories: [
      "Books",
      "AI Engineering",
      "AI Engineering (Books)",
      "Machine Learning (Books)",
      "LLMs (Books)",
      "AI (Books)",
      "AI Safety (Books)",
      "AI Security (Books)",
      "AI Research (Books)",
      "Agentic AI (Books)",
      "Cybersecurity (Books)",
      "Open Source (Books)",
      "Software Engineering (Books)",
    ],
  },
  {
    slug: "laptops-wearables",
    title: "Laptops, watches and phones",
    blurb: "Laptops, smartwatches and phones for work and daily life.",
    categories: ["Laptops", "Smartwatches", "Phones"],
  },
  {
    slug: "keyboards-input",
    title: "Keyboards, mice and input",
    blurb: "Keyboards and pointing devices for a better desk.",
    categories: ["Keyboards", "Input Devices"],
  },
  {
    slug: "monitors",
    title: "Monitors and displays",
    blurb: "Screens for coding, editing and everything else.",
    categories: ["Monitors"],
  },
  {
    slug: "desk-workspace",
    title: "Desk and workspace",
    blurb: "Docks, webcams, audio and desk setup.",
    categories: ["Desk Setup", "Docking & Hubs", "Webcams", "Audio", "Creative Tools"],
  },
  {
    slug: "everyday",
    title: "Everyday gadgets and small gifts",
    blurb: "Chargers, cables and everyday carry.",
    categories: ["Cables & Chargers", "Everyday Carry", "Cleaning & Care", "Wellness & Ergonomics"],
  },
];

// Some catalog rows only carry Amazon's generic placeholder logo as their
// image (the link-preview fallback). Treat those, and empty values, as "no
// image" so the page shows a neutral tile instead of another store's logo.
// Moved to lib/product-images.ts so the scraper and the other pages share it.
export { hasProductImage };

export function sectionSlugFor(category: string | null): string {
  if (!category) return "more";
  return SECTIONS.find((s) => s.categories.includes(category))?.slug ?? "more";
}

// ---------------------------------------------------------------------------
// Holidays: "Top N products for <holiday>"
// ---------------------------------------------------------------------------

export type Holiday = {
  slug: string; // also the catalog tag that puts a product on this holiday's list
  name: string; // "Black Friday"
  niche: string; // the short label on this list's card in the Top 10 series row
  date: string; // ISO date of the day itself
  h1: string; // page heading
  seoTitle: string;
  seoDescription: string;
  intro: string;
  sections: string[]; // SECTIONS slugs this list draws from
};

export const HOLIDAYS: Holiday[] = [
  {
    slug: "thanksgiving-week",
    name: "Thanksgiving",
    niche: "Early shopping",
    date: "2026-11-26",
    h1: "Top 10 Thanksgiving week tech and gear picks readers are looking at",
    seoTitle: "Top 10 Thanksgiving 2026 Tech & Gear Picks | Phugialy Deals",
    seoDescription:
      "The 10 tech and gear products popular with Phugialy readers in Thanksgiving week 2026: AI mini PCs, monitors, keyboards and desk upgrades. Refreshed daily.",
    intro:
      "Thanksgiving week is when many people start their holiday shopping early. These are popular products in our catalog. The first few are what readers opened most in the last week and the rest rotate daily, so you can compare them before the big sales days.",
    sections: ["ai-computing", "laptops-wearables", "monitors", "keyboards-input", "desk-workspace", "everyday"],
  },
  {
    slug: "black-friday",
    name: "Black Friday",
    niche: "Tech and gear",
    date: "2026-11-27",
    h1: "Top 10 Black Friday tech and gear picks readers are looking at",
    seoTitle: "Top 10 Black Friday 2026 Tech & Gear Picks | Phugialy Deals",
    seoDescription:
      "The 10 tech and gear products popular with Phugialy readers ahead of Black Friday 2026: AI mini PCs, monitors, keyboards and desk upgrades. Refreshed daily.",
    intro:
      "Black Friday is the day many people finally buy the computer gear they have been watching. These are popular products in our catalog, from AI mini PCs to monitors and keyboards. The first few are what readers opened most in the last week and the rest rotate daily.",
    sections: ["ai-computing", "laptops-wearables", "monitors", "keyboards-input", "desk-workspace"],
  },
  {
    slug: "cyber-monday",
    name: "Cyber Monday",
    niche: "Desk and homelab",
    date: "2026-11-30",
    h1: "Top 10 Cyber Monday picks for your desk and your homelab",
    seoTitle: "Top 10 Cyber Monday 2026 Picks for Your Desk & Homelab | Phugialy Deals",
    seoDescription:
      "The 10 desk, computing and gadget products popular with Phugialy readers ahead of Cyber Monday 2026. Refreshed daily.",
    intro:
      "Cyber Monday leans toward things you plug in. This list pulls from the computing, desk and gadget products in our catalog. The first few are what readers opened most in the last week and the rest rotate daily.",
    sections: ["ai-computing", "laptops-wearables", "desk-workspace", "keyboards-input", "everyday"],
  },
  {
    slug: "christmas-gifts",
    name: "Christmas",
    niche: "Gifts for builders",
    date: "2026-12-25",
    h1: "Top 10 Christmas gifts for the person who builds with AI",
    seoTitle: "Top 10 Christmas 2026 Gifts for Developers & AI Builders | Phugialy Deals",
    seoDescription:
      "The 10 gifts for developers and AI builders that are popular with Phugialy readers this season: desk gear, gadgets and computing hardware. Refreshed daily.",
    intro:
      "Shopping for someone who codes, writes or builds with AI? These are desk upgrades, small gadgets and computing hardware from our catalog. The first few are what readers opened most in the last week and the rest rotate daily.",
    // Books stay in this list only so default tags are unchanged; they never show
    // on the Deals pages (see dropBooks), which is why the copy above does not mention them.
    sections: ["books", "everyday", "laptops-wearables", "desk-workspace", "keyboards-input", "ai-computing"],
  },
  {
    slug: "new-year-setup",
    name: "New Year",
    niche: "Home office",
    date: "2027-01-01",
    h1: "Top 10 New Year home-office and desk setup upgrades",
    seoTitle: "Top 10 New Year 2027 Home Office & Desk Upgrades | Phugialy Deals",
    seoDescription:
      "The 10 home-office and desk upgrades popular with Phugialy readers heading into 2027: monitors, keyboards, webcams and more. Refreshed daily.",
    intro:
      "A new year is a good excuse to fix your desk. These are monitors, keyboards, webcams and workspace gear from our catalog. The first few are what readers opened most in the last week and the rest rotate daily.",
    sections: ["desk-workspace", "monitors", "keyboards-input", "books"],
  },
];

export function getHoliday(slug: string): Holiday | undefined {
  return HOLIDAYS.find((h) => h.slug === slug);
}

export function daysUntil(isoDate: string, now: number = Date.now()): number {
  return Math.ceil((Date.parse(`${isoDate}T00:00:00Z`) - now) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

// Eligible: active catalog items that are not partner placements (Ambit and
// ElevenLabs have their own approved placements), not under review, and not
// hand-hidden.
export function isEligible(product: DealsProduct, hides: string[] = DEALS_HIDES): boolean {
  return !product.is_partner && !product.flag_reason && !hides.includes(product.id);
}

// Activity per product from human-flagged clicks. Counting distinct (browser,
// day) pairs, not raw clicks, blunts one automated client hitting a link
// repeatedly. Click counts are still an imperfect proxy for demand.
export function scoreProducts(
  products: DealsProduct[],
  clicks: ClickRow[],
  now: number = Date.now(),
  windowDays: number = TRENDING_WINDOW_DAYS
): ScoredProduct[] {
  const recent = new Map<string, Set<string>>();
  const prior = new Map<string, Set<string>>();
  const windowMs = windowDays * DAY_MS;

  for (const click of clicks) {
    if (!click.product_id) continue;
    const at = Date.parse(click.created_at);
    if (Number.isNaN(at)) continue;
    const age = now - at;
    if (age < 0 || age >= windowMs * 2) continue;
    const key = `${click.user_agent ?? "?"}|${new Date(at).toISOString().slice(0, 10)}`;
    const bucket = age < windowMs ? recent : prior;
    if (!bucket.has(click.product_id)) bucket.set(click.product_id, new Set());
    bucket.get(click.product_id)!.add(key);
  }

  return products.map((product) => {
    const score = recent.get(product.id)?.size ?? 0;
    const previous = prior.get(product.id)?.size ?? 0;
    return { ...product, score, previous, rising: score >= MIN_TRENDING_SCORE && score > previous * 1.3 };
  });
}

const byActivity = (a: ScoredProduct, b: ScoredProduct) =>
  b.score - a.score || b.previous - a.previous || a.name.localeCompare(b.name);

// How many of a list's first places stay with the products readers really do
// open most. Everything after them rotates daily (lib/deals-rotation.ts).
export const ANCHORS = { overall: 2, holiday: 3, section: 1, row: 2 } as const;

// The order a list is shown in: `anchors` most-opened products (only ones with
// real recent activity) first, then the rest by this period's rotation key.
// With no rotation keys set, this is exactly the old order by activity.
export function shownOrder(list: ScoredProduct[], anchors: number): ScoredProduct[] {
  const byAct = [...list].sort(byActivity);
  if (!byAct.some((p) => (p.rotation ?? 0) > 0)) return byAct;
  // The most-opened products keep the first places, but a product with only a
  // grey placeholder tile does not take one while enough with a real picture
  // are available (the first slots are the ones every visitor sees).
  const active = byAct.filter((p) => p.score > 0);
  const withPicture = active.filter((p) => hasProductImage(p.image_url));
  const anchored = (withPicture.length >= anchors ? withPicture : active).slice(0, anchors);
  const taken = new Set(anchored.map((p) => p.id));
  const rest = byAct
    .filter((p) => !taken.has(p.id))
    .sort((a, b) => (b.rotation ?? 0) - (a.rotation ?? 0) || byActivity(a, b));
  return [...anchored, ...rest];
}

// Pins first (listed order), then recent activity. Quiet products still fill the list.
export function topOverall(
  scored: ScoredProduct[],
  limit: number = TOP_OVERALL,
  pins: string[] = DEALS_PINS
): ScoredProduct[] {
  const pinned = pins
    .map((id) => scored.find((p) => p.id === id))
    .filter((p): p is ScoredProduct => Boolean(p));
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const rest = shownOrder(scored.filter((p) => !pinnedIds.has(p.id)), ANCHORS.overall);
  return [...pinned, ...rest].slice(0, limit);
}

// The "Top N for <holiday>" list: products from the holiday's sections ranked
// by recent activity, with no single section taking more than a share of the
// list so it stays varied. Pins that belong to the holiday go first.
export function holidayTop(
  holiday: Holiday,
  scored: ScoredProduct[],
  n: number = TOP_N,
  pins: string[] = DEALS_PINS
): ScoredProduct[] {
  // A product carrying the holiday's tag belongs on its list. Products with no
  // tags at all (the fallback before the catalog table exists) go by category.
  const inScope = scored.filter((p) =>
    p.tags ? p.tags.includes(holiday.slug) : holiday.sections.includes(sectionSlugFor(p.category))
  );
  const maxPerSection = Math.max(2, Math.ceil(n / Math.max(1, holiday.sections.length)) + 1);
  const taken: ScoredProduct[] = [];
  const perSection = new Map<string, number>();

  const add = (p: ScoredProduct) => {
    const slug = sectionSlugFor(p.category);
    if ((perSection.get(slug) ?? 0) >= maxPerSection) return false;
    perSection.set(slug, (perSection.get(slug) ?? 0) + 1);
    taken.push(p);
    return true;
  };

  for (const id of pins) {
    const p = inScope.find((x) => x.id === id);
    if (p && taken.length < n) add(p);
  }
  const ordered = shownOrder(inScope, ANCHORS.holiday);
  for (const p of ordered) {
    if (taken.length >= n) break;
    if (!taken.some((t) => t.id === p.id)) add(p);
  }
  // If the section caps left the list short, fill from what is left.
  for (const p of ordered) {
    if (taken.length >= n) break;
    if (!taken.some((t) => t.id === p.id)) taken.push(p);
  }
  return taken.slice(0, n);
}

export type DealsSection = {
  slug: string;
  title: string;
  blurb: string;
  products: ScoredProduct[];
  activity: number;
};

export function buildSections(
  scored: ScoredProduct[],
  perSection: number = PER_SECTION,
  excludeIds: Set<string> = new Set()
): DealsSection[] {
  const known = new Set(SECTIONS.flatMap((s) => s.categories));
  const groups = [
    ...SECTIONS,
    { slug: "more", title: "More picks", blurb: "Other items readers are looking at.", categories: [] as string[] },
  ];

  const sections = groups.map((group) => {
    const members = scored.filter((p) =>
      group.slug === "more" ? !p.category || !known.has(p.category) : group.categories.includes(p.category ?? "")
    );
    const fresh = shownOrder(members.filter((p) => !excludeIds.has(p.id)), ANCHORS.section);
    const shown = (fresh.length > 0 ? fresh : shownOrder(members, ANCHORS.section)).slice(0, perSection);
    return {
      slug: group.slug,
      title: group.title,
      blurb: group.blurb,
      products: shown,
      activity: members.reduce((n, p) => n + p.score, 0),
    };
  });

  return sections.filter((s) => s.products.length > 0).sort((a, b) => b.activity - a.activity);
}

// ---------------------------------------------------------------------------
// The product explorer (search, filter, sort on the page, no server calls)
// ---------------------------------------------------------------------------

export type ExplorerItem = {
  id: string;
  name: string;
  category: string | null;
  section: string;
  image_url: string | null;
  buy_if: string | null;
  score: number;
  rising: boolean;
  tags: string[]; // the Deals catalog tags (see DEALS_CATALOG_TAGS)
  pinned: number | null; // 1 = first; null = not pinned
  rotation?: number; // see ScoredProduct.rotation
};

export type ExplorerSort = "trending" | "name";

export function toExplorerItems(scored: ScoredProduct[]): ExplorerItem[] {
  return scored.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    section: sectionSlugFor(p.category),
    image_url: p.image_url,
    buy_if: p.buy_if,
    score: p.score,
    rising: p.rising,
    tags: p.tags ?? defaultTagsFor(p.category, p.name),
    pinned: p.pinned_rank ?? null,
    rotation: p.rotation ?? 0,
  }));
}

export function filterExplorer(
  items: ExplorerItem[],
  opts: { query?: string; section?: string; sort?: ExplorerSort; size?: PurchaseSize | "all" }
): ExplorerItem[] {
  const terms = (opts.query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const filtered = items.filter((item) => {
    if (opts.section && opts.section !== "all" && item.section !== opts.section) return false;
    // Only products with a size label can match a size; unlabeled ones are
    // left out of a size filter rather than guessed.
    if (opts.size && opts.size !== "all" && purchaseSize(item) !== opts.size) return false;
    if (terms.length === 0) return true;
    const haystack = `${item.name} ${item.category ?? ""} ${item.buy_if ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const sorted = [...filtered];
  if (opts.sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else {
    // Pinned products first (1, 2, 3...), then recent activity.
    const pin = (item: ExplorerItem) => item.pinned ?? Number.MAX_SAFE_INTEGER;
    sorted.sort((a, b) => pin(a) - pin(b) || b.score - a.score || a.name.localeCompare(b.name));
    // Browsing (no search words) rotates daily after the pins and the most-
    // opened anchors. A search keeps its plain order so results do not shuffle.
    if (terms.length === 0 && sorted.some((i) => (i.rotation ?? 0) > 0)) {
      const pinned = sorted.filter((i) => i.pinned !== null);
      const rest = sorted.filter((i) => i.pinned === null);
      const anchored = rest.filter((i) => i.score > 0).slice(0, ANCHORS.row);
      const taken = new Set(anchored.map((i) => i.id));
      const rotated = rest
        .filter((i) => !taken.has(i.id))
        .sort((a, b) => (b.rotation ?? 0) - (a.rotation ?? 0) || b.score - a.score || a.name.localeCompare(b.name));
      return [...pinned, ...anchored, ...rotated];
    }
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// The dedicated Deals catalog: tags kept in the deals_catalog table
// ---------------------------------------------------------------------------
//
// The Deals pages read the same affiliate_products rows as the rest of the
// site. Every eligible product (active, not a partner placement, not flagged,
// not a book) appears automatically with tags worked out from its category.
// The deals_catalog table holds only overrides, one row per product at most:
// hide it, pin it, or replace its tags. It is edited from /admin/deals. With no
// table or no rows, every product simply keeps its category tags.

// The tags the Deals pages understand. Holiday tags are the HOLIDAYS slugs.
export const DEALS_CATALOG_TAGS = [
  "technology",
  "ai",
  "books",
  "desk",
  ...["thanksgiving-week", "black-friday", "cyber-monday", "christmas-gifts", "new-year-setup"],
] as const;

// Tags a product gets from its category when it has no catalog entry yet. The
// seed for deals_catalog is generated from this, so the two always agree.
const NOT_TECH_CATEGORIES = new Set(["Everyday Carry", "Cleaning & Care", "Wellness & Ergonomics"]);
const AI_TOPIC = /\bAI\b|artificial intelligence|machine learning|deep learning|\bLLMs?\b|language model|neural|agentic|claude|chatgpt/i;

// `name` is optional; with it, a book is tagged "ai" only when its category or
// its title is about AI (a productivity or licensing book is not).
export function defaultTagsFor(category: string | null, name: string | null = null): string[] {
  const section = sectionSlugFor(category);
  if (section === "more") return [];
  const tags = new Set<string>();
  if (section !== "books" && !NOT_TECH_CATEGORIES.has(category ?? "")) tags.add("technology");
  if (section === "ai-computing") tags.add("ai");
  if (section === "books") {
    const aiBook = AI_TOPIC.test(`${category ?? ""} ${name ?? ""}`) || name === null;
    if (aiBook) tags.add("ai");
  }
  if (section === "books") tags.add("books");
  if (["keyboards-input", "monitors", "desk-workspace"].includes(section)) tags.add("desk");
  for (const holiday of HOLIDAYS) if (holiday.sections.includes(section)) tags.add(holiday.slug);
  return [...tags];
}

export type CatalogRow = {
  product_id: string;
  tags: string[] | null;
  pinned_rank: number | null;
  hidden: boolean;
};

export function normalizeTags(tags: readonly string[] | null | undefined): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))];
}

// Joins catalog entries onto products. Every eligible product appears, so a
// product added to the affiliate catalog shows up on its own, with tags worked
// out from its category. An entry is an override: `hidden` removes the product,
// non-empty `tags` replace the category defaults, `pinned_rank` pins it.
// `dedicated` says whether any overrides exist at all.
export function attachCatalog<T extends DealsProduct>(
  products: T[],
  rows: CatalogRow[] | null | undefined
): { products: (T & { tags: string[]; pinned_rank: number | null })[]; dedicated: boolean } {
  const byId = new Map((rows ?? []).map((r) => [r.product_id, r]));
  const kept: (T & { tags: string[]; pinned_rank: number | null })[] = [];
  for (const product of products) {
    const row = byId.get(product.id);
    if (row?.hidden) continue;
    const tags = normalizeTags(row?.tags);
    kept.push({
      ...product,
      tags: tags.length > 0 ? tags : defaultTagsFor(product.category, product.name),
      pinned_rank: row?.pinned_rank ?? null,
    });
  }
  return { products: kept, dedicated: byId.size > 0 };
}

// ---------------------------------------------------------------------------
// Managing the catalog (the /admin/deals screen)
// ---------------------------------------------------------------------------

export type ManagerRow = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  tags: string[]; // what the page uses right now
  hidden: boolean;
  pinned_rank: number | null;
  overridden: boolean; // has a deals_catalog row
};

// Every eligible product with its current override state, hidden ones included,
// so the manager can bring a hidden product back.
export function buildManagerRows<T extends DealsProduct>(products: T[], rows: CatalogRow[] | null | undefined): ManagerRow[] {
  const byId = new Map((rows ?? []).map((r) => [r.product_id, r]));
  return products
    .map((p) => {
      const row = byId.get(p.id);
      const tags = normalizeTags(row?.tags);
      return {
        id: p.id,
        name: p.name ?? "",
        category: p.category,
        image_url: p.image_url ?? null,
        tags: tags.length > 0 ? tags : defaultTagsFor(p.category, p.name),
        hidden: Boolean(row?.hidden),
        pinned_rank: row?.pinned_rank ?? null,
        overridden: Boolean(row),
      };
    })
    .sort((a, b) => Number(a.hidden) - Number(b.hidden) || (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name));
}

export type OverrideInput = { tags?: unknown; hidden?: unknown; pinned_rank?: unknown };
export type OverrideValues = { tags?: string[]; hidden?: boolean; pinned_rank?: number | null };

// Validates what the manager sends. Unknown tags are dropped so a typo cannot
// create a tab or holiday that does not exist.
export function sanitizeOverride(input: OverrideInput): { ok: true; values: OverrideValues } | { ok: false; error: string } {
  const values: OverrideValues = {};
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string")) return { ok: false, error: "tags must be a list of text" };
    const allowed = new Set<string>(DEALS_CATALOG_TAGS);
    values.tags = normalizeTags(input.tags as string[]).filter((t) => allowed.has(t));
  }
  if (input.hidden !== undefined) {
    if (typeof input.hidden !== "boolean") return { ok: false, error: "hidden must be true or false" };
    values.hidden = input.hidden;
  }
  if (input.pinned_rank !== undefined) {
    if (input.pinned_rank !== null && !(typeof input.pinned_rank === "number" && Number.isInteger(input.pinned_rank) && input.pinned_rank > 0)) {
      return { ok: false, error: "pinned_rank must be a whole number above 0, or empty" };
    }
    values.pinned_rank = input.pinned_rank as number | null;
  }
  if (Object.keys(values).length === 0) return { ok: false, error: "nothing to change" };
  return { ok: true, values };
}

// Product ids in pin order: the code-level pins first, then catalog pins by rank.
export function pinOrder(items: { id: string; pinned_rank?: number | null }[], codePins: string[] = DEALS_PINS): string[] {
  const fromCatalog = items
    .filter((i) => typeof i.pinned_rank === "number")
    .sort((a, b) => (a.pinned_rank as number) - (b.pinned_rank as number))
    .map((i) => i.id);
  return [...new Set([...codePins, ...fromCatalog])];
}

// ---------------------------------------------------------------------------
// The catalog grid: tabs, search and 10 per page
// ---------------------------------------------------------------------------

export const CATALOG_PAGE_SIZE = 10;
export const CATALOG_MAX_PAGES = 3; // 30 products per tab at most

export type CatalogTab = { slug: string; label: string; tag: string | null; blurb: string };

export const CATALOG_TABS: CatalogTab[] = [
  { slug: "trends", label: "Trends", tag: null, blurb: "Everything on this page. The first picks are what readers opened most this week; the rest rotate daily." },
  { slug: "thanksgiving", label: "Thanksgiving", tag: "thanksgiving-week", blurb: "Early-shopping picks for Thanksgiving week." },
  { slug: "christmas", label: "Christmas", tag: "christmas-gifts", blurb: "Gift ideas for people who build, code and read." },
  { slug: "technology", label: "Technology", tag: "technology", blurb: "Computers, screens, storage and accessories." },
  { slug: "ai", label: "AI", tag: "ai", blurb: "Hardware and books for building AI systems at home." },
  { slug: "books", label: "Books", tag: "books", blurb: "Reading for people building with AI." },
  { slug: "desk", label: "Desk setup", tag: "desk", blurb: "Keyboards, monitors and workspace upgrades." },
];

export function itemsForTab(items: ExplorerItem[], tab: CatalogTab, query: string = ""): ExplorerItem[] {
  const base = tab.tag ? items.filter((i) => i.tags.includes(tab.tag as string)) : items;
  return filterExplorer(base, { query, sort: "trending" }).slice(0, CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES);
}

// Tabs worth showing: "Trends" always, any other only if it has products.
export function visibleTabs(items: ExplorerItem[]): CatalogTab[] {
  return CATALOG_TABS.filter((tab) => tab.tag === null || items.some((i) => i.tags.includes(tab.tag as string)));
}

// One horizontal row per product category, like a streaming home screen (see
// buildCategoryRows). A category needs at least CATEGORY_ROW_MIN products to get
// its own row.
export const CATEGORY_ROW_MIN = 5;
// A shopping section made of small categories needs at least this many products for its own row.
export const SECTION_ROW_MIN = 4;
export type CategoryRow = { slug: string; label: string; blurb: string; items: ExplorerItem[] };

// How a row made from one catalog category is named. A category not listed here
// keeps its own name and a plain blurb.
const ROW_COPY: Record<string, { label: string; blurb: string }> = {
  Laptops: { label: "Laptops", blurb: "Laptops for work, study and travel." },
  Smartwatches: { label: "Smartwatches", blurb: "Watches for fitness, notifications and sleep." },
  Phones: { label: "Phones", blurb: "Phones for work and daily life." },
  "AI Hardware": { label: "Mini PCs and AI hardware", blurb: "Mini PCs, graphics cards and boards for running AI at home." },
  Audio: { label: "Headphones and audio", blurb: "Noise-cancelling headphones for work, travel and home." },
  Monitors: { label: "Monitors", blurb: "Ultrawide, portable and everyday screens." },
  Keyboards: { label: "Keyboards and mice", blurb: "Mechanical, wireless and ergonomic keyboards and mice." },
  Webcams: { label: "Webcams", blurb: "For calls, streaming and recording." },
  "Docking & Hubs": { label: "Docks and hubs", blurb: "More ports from one cable to your laptop." },
  "Desk Setup": { label: "Desk setup", blurb: "Standing desks and stands." },
  "Creative Tools": { label: "Creative tools", blurb: "Drawing tablets and tools for making things." },
  Storage: { label: "Storage", blurb: "Portable drives for backups and big files." },
};

// Categories that share a row with a larger one (mice and macro pads sit with keyboards).
const ROW_ALIAS: Record<string, string> = { "Input Devices": "Keyboards" };

// Row order: the categories the season's shoppers move on first, then the rest.
// Fixed on purpose, so the page does not reshuffle its rows every day (the
// products inside a row still rotate).
const ROW_ORDER = [
  "Laptops", "Smartwatches", "Phones", "AI Hardware", "Audio", "Monitors", "Keyboards", "Webcams",
  "Docking & Hubs", "Input Devices", "Desk Setup", "Creative Tools", "Storage",
];

function rowSlug(text: string): string {
  return text.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "row";
}

// The catalog as rows by product category. Every product appears exactly once:
// in the row for its own category when that category has at least
// CATEGORY_ROW_MIN products; otherwise with the other small categories of its
// shopping section (when those add up to SECTION_ROW_MIN) (for example cables, a tumbler and screen cleaner together as
// "Everyday gadgets and small gifts"); anything still left goes to "More to
// browse". Inside a row, products with a real picture come first, then the usual
// rotation-aware ranking.
export function buildCategoryRows(items: ExplorerItem[]): CategoryRow[] {
  const cap = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES;
  const ranked = filterExplorer(items, { query: "", sort: "trending" });
  const pictureFirst = (list: ExplorerItem[]) =>
    list
      .map((item, index) => ({ item, index }))
      .sort((a, b) => Number(!hasProductImage(a.item.image_url)) - Number(!hasProductImage(b.item.image_url)) || a.index - b.index)
      .map((entry) => entry.item);

  const byCategory = new Map<string, ExplorerItem[]>();
  for (const item of ranked) {
    const own = item.category?.trim() ?? "";
    const key = ROW_ALIAS[own] ?? own;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }

  const rows: { order: number; row: CategoryRow }[] = [];
  let leftovers: ExplorerItem[] = [];
  for (const [category, list] of byCategory) {
    if (!category || list.length < CATEGORY_ROW_MIN) {
      leftovers = leftovers.concat(list);
      continue;
    }
    const shown = pictureFirst(list);
    const copy = ROW_COPY[category] ?? { label: category, blurb: `${category} picks from our catalog.` };
    const known = ROW_ORDER.indexOf(category);
    rows.push({ order: known === -1 ? ROW_ORDER.length + rows.length : known, row: { slug: rowSlug(category), label: copy.label, blurb: copy.blurb, items: shown.slice(0, cap) } });
    leftovers = leftovers.concat(shown.slice(cap));
  }

  // Small categories join the others of their shopping section.
  const bySection = new Map<string, ExplorerItem[]>();
  for (const item of leftovers) bySection.set(item.section, [...(bySection.get(item.section) ?? []), item]);
  const rest: ExplorerItem[] = [];
  for (const section of SECTIONS) {
    const list = bySection.get(section.slug) ?? [];
    bySection.delete(section.slug);
    if (list.length >= SECTION_ROW_MIN) {
      rows.push({ order: 100 + rows.length, row: { slug: section.slug, label: section.title, blurb: section.blurb, items: pictureFirst(list).slice(0, cap) } });
    } else {
      rest.push(...list);
    }
  }
  for (const list of bySection.values()) rest.push(...list);

  const out = rows.sort((a, b) => a.order - b.order).map((entry) => entry.row);
  const more = filterExplorer(rest, { query: "", sort: "trending" }).slice(0, cap);
  if (more.length > 0) {
    out.push({ slug: "more", label: "More to browse", blurb: "Everything else we list. The first picks are what readers opened most; the rest rotate daily.", items: more });
  }
  return out;
}

export function paginate<T>(items: T[], page: number, size: number = CATALOG_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length };
}

// ---------------------------------------------------------------------------
// The pinned "Top 10 series" row
// ---------------------------------------------------------------------------

export const DEALS_PINNED_TAG = "deals-pinned"; // an article with this tag (and DEALS_TAG) is pinned in the series row
const SERIES_META_TAGS = new Set([DEALS_TAG, DEALS_PINNED_TAG, "top-10", "buying-guide", "gift-guide"]);

export const NICHE_LABELS: Record<string, string> = {
  "local-ai": "Local AI",
  "mini-pc": "Mini PCs",
  ai: "AI",
  books: "Books",
  keyboards: "Keyboards",
  monitors: "Monitors",
  "desk-setup": "Desk setup",
  "home-office": "Home office",
  gadgets: "Gadgets",
};

export function humanizeTag(tag: string): string {
  const key = tag.trim().toLowerCase();
  if (NICHE_LABELS[key]) return NICHE_LABELS[key];
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// The niche shown on an article's card: its first tag that is not a
// bookkeeping tag, e.g. ["holiday-guide","local-ai","mini-pc"] -> "Local AI".
export function nicheFromTags(tags: readonly string[] | null | undefined): string {
  const first = (tags ?? []).find((t) => t.trim() !== "" && !SERIES_META_TAGS.has(t.trim().toLowerCase()));
  return first ? humanizeTag(first) : "Buying guide";
}

export type SeriesCard = {
  key: string;
  kind: "article" | "holiday";
  niche: string;
  title: string;
  blurb: string;
  href: string;
  image: string | null;
  // What a Top 10 list holds, drawn on its cover: a few product photos, the
  // categories they come from, and how many products the list has.
  cover?: SeriesCover;
};

export type SeriesCover = { images: { src: string; alt: string }[]; categories: string[]; count: number };

// Builds a list's cover from its products: photos of the first few that have a
// real picture (never Amazon's placeholder logo), the first distinct categories,
// and the product count.
export function coverFor(
  list: { name: string; category: string | null; image_url: string | null }[],
  options: { photos?: number; categories?: number } = {}
): SeriesCover | undefined {
  if (list.length === 0) return undefined;
  const photos = options.photos ?? 3;
  const categoryCount = options.categories ?? 3;
  const images: { src: string; alt: string }[] = [];
  for (const p of list) {
    if (images.length === photos) break;
    if (hasProductImage(p.image_url) && !images.some((i) => i.src === p.image_url)) images.push({ src: p.image_url!, alt: p.name });
  }
  const categories: string[] = [];
  for (const p of list) {
    const c = p.category?.trim();
    if (c && !categories.includes(c)) categories.push(c);
    if (categories.length === categoryCount) break;
  }
  return { images, categories, count: list.length };
}

type SeriesArticle = {
  _id: string;
  slug: string;
  title: string;
  tags: string[];
  publishDate?: number;
  createdAt?: number;
  metadata?: { heroImageUrl?: string; aiSummary?: string; readerHook?: string };
};

export function isPinnedGuide(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).some((t) => t.trim().toLowerCase() === DEALS_PINNED_TAG);
}

// The cards in the pinned row: guides tagged DEALS_PINNED_TAG first (newest
// first), then the "Top 10 for <holiday>" lists, which always exist.
export function buildSeries(
  articles: SeriesArticle[],
  limit: number = 8,
  covers: Record<string, SeriesCover | undefined> = {}
): SeriesCard[] {
  const when = (a: SeriesArticle) => a.publishDate ?? a.createdAt ?? 0;
  const pinned: SeriesCard[] = articles
    .filter((a) => isPinnedGuide(a.tags))
    .sort((a, b) => when(b) - when(a))
    .map((a) => ({
      key: `article-${a._id}`,
      kind: "article" as const,
      niche: nicheFromTags(a.tags),
      title: a.title,
      blurb: a.metadata?.readerHook || a.metadata?.aiSummary || "",
      href: `/blog/${a.slug}`,
      image: a.metadata?.heroImageUrl ?? null,
    }));
  const holidays: SeriesCard[] = HOLIDAYS.map((h) => ({
    key: `holiday-${h.slug}`,
    kind: "holiday" as const,
    niche: h.niche,
    title: h.h1,
    blurb: h.intro,
    href: `/deals/${h.slug}`,
    image: null,
    cover: covers[h.slug],
  }));
  return [...pinned, ...holidays].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Product -> guide links
// ---------------------------------------------------------------------------

export type GuideLink = { slug: string; title: string };

type GuideForLinks = { slug: string; title: string; content: string; when: number };

const GO_LINK = /\/api\/affiliate\/go\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

// A guide names its products by the same /api/affiliate/go/<id> links the
// cards use, so the guide text is the one source of truth for what it features.
export function extractGuideProductIds(content: string | null | undefined): string[] {
  const ids = new Set<string>();
  for (const match of (content ?? "").matchAll(GO_LINK)) ids.add(match[1].toLowerCase());
  return [...ids];
}

// product id -> the newest published guide that features it.
export function buildGuideLinks(guides: GuideForLinks[]): Record<string, GuideLink> {
  const links: Record<string, GuideLink> = {};
  for (const guide of [...guides].sort((a, b) => b.when - a.when)) {
    for (const id of extractGuideProductIds(guide.content)) {
      if (!links[id]) links[id] = { slug: guide.slug, title: guide.title };
    }
  }
  return links;
}

// ---------------------------------------------------------------------------
// Links and structured data
// ---------------------------------------------------------------------------

export function dealsRef(slug: string): string {
  return `deals-${slug}`;
}

export function goHref(productId: string, refSlug: string): string {
  return `/api/affiliate/go/${productId}?ref=${encodeURIComponent(dealsRef(refSlug))}`;
}

// The labels a Deals click or impression can carry: the same string on both
// sides, so click-through works out per section. The tracking endpoint is
// public, so it only accepts labels the pages can actually produce.
const CATALOG_ROW_REF = /^deals-catalog-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isDealsRef(ref: unknown): ref is string {
  if (typeof ref !== "string" || ref.length > 60) return false;
  if (ref === dealsRef("trending") || ref === dealsRef("catalog-search")) return true;
  if (HOLIDAYS.some((holiday) => ref === dealsRef(holiday.slug))) return true;
  return CATALOG_ROW_REF.test(ref);
}

// A readable name for a label, for the results panel.
export function describeDealsRef(ref: string): string {
  if (ref === dealsRef("trending")) return "Trending now";
  if (ref === dealsRef("catalog-search")) return "Catalog search results";
  const holiday = HOLIDAYS.find((h) => ref === dealsRef(h.slug));
  if (holiday) return `Top 10: ${holiday.name}`;
  if (ref.startsWith("deals-catalog-")) {
    return `Catalog row: ${ref.slice("deals-catalog-".length).replace(/-/g, " ")}`;
  }
  return ref;
}

// schema.org ItemList for a ranked page. Items point at on-page anchors, not
// affiliate redirects.
export function buildItemListJsonLd(opts: {
  name: string;
  url: string;
  items: { name: string; anchor: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${opts.url}#${item.anchor}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Deals (the "Featured deals" strip)
// ---------------------------------------------------------------------------

export type Deal = {
  id: string;
  merchant: string;
  title: string;
  description: string;
  url: string; // full external link including our affiliate tag
  promoCode?: string;
  validFrom?: string; // ISO date; omitted = already live
  validTo?: string; // ISO date; the deal disappears after this day
  featured?: boolean;
};

export function activeDeals(deals: Deal[], now: number = Date.now()): Deal[] {
  return deals
    .filter((d) => {
      if (d.validFrom && now < Date.parse(`${d.validFrom}T00:00:00Z`)) return false;
      if (d.validTo && now >= Date.parse(`${d.validTo}T00:00:00Z`) + DAY_MS) return false;
      return true;
    })
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}
