// Pure logic for the temporary Deals section (/deals and /deals/<holiday>).
// No database, no network, no "@/" imports, so it runs under Vitest with no
// setup. The server wiring is in lib/deals.ts.

export const DEALS_TAG = "holiday-guide"; // articles carrying this tag appear in the Deals section
export const DEALS_STARTS_AT = Date.parse("2026-11-01T00:00:00Z");
// After this the section redirects to /resources and the nav item, strip and links disappear.
export const DEALS_ENDS_AT = Date.parse("2027-01-03T00:00:00Z");

export function isDealsActive(now: number = Date.now()): boolean {
  return now >= DEALS_STARTS_AT && now < DEALS_ENDS_AT;
}

// Hand controls. Ids are affiliate_products.id values. Pins show first on every
// list that includes them (in this order); hides never appear anywhere here.
export const DEALS_PINS: string[] = [];
export const DEALS_HIDES: string[] = [
  "cb5793d4-53a7-4952-b618-24d3abcc1393", // duplicate of the 2084 book listed under AI Engineering
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
  is_partner: boolean;
  flag_reason: string | null;
};

export type ClickRow = { product_id: string | null; user_agent: string | null; created_at: string };

export type ScoredProduct = DealsProduct & {
  score: number; // distinct (browser, day) pairs in the last 7 days
  previous: number; // the same for the 7 days before
  rising: boolean;
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
export function hasProductImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return !/\/images\/G\/01\/share-icons\/|previewdoh|\/amazon\.png(\?|$)/i.test(url);
}

export function sectionSlugFor(category: string | null): string {
  if (!category) return "more";
  return SECTIONS.find((s) => s.categories.includes(category))?.slug ?? "more";
}

// ---------------------------------------------------------------------------
// Holidays: "Top N products for <holiday>"
// ---------------------------------------------------------------------------

export type Holiday = {
  slug: string;
  name: string; // "Black Friday"
  date: string; // ISO date of the day itself
  h1: string; // page heading
  seoTitle: string;
  seoDescription: string;
  intro: string;
  sections: string[]; // SECTIONS slugs this list draws from
};

export const HOLIDAYS: Holiday[] = [
  {
    slug: "black-friday",
    name: "Black Friday",
    date: "2026-11-27",
    h1: "Top 10 Black Friday tech and gear picks readers are looking at",
    seoTitle: "Top 10 Black Friday 2026 Tech & Gear Picks | Phugialy Deals",
    seoDescription:
      "The 10 tech and gear products Phugialy readers have been opening most ahead of Black Friday 2026: AI mini PCs, monitors, keyboards and desk upgrades. Refreshed daily.",
    intro:
      "Black Friday is the day many people finally buy the computer gear they have been watching. These are the products in our catalog that readers have opened most in the last week, from AI mini PCs to monitors and keyboards.",
    sections: ["ai-computing", "monitors", "keyboards-input", "desk-workspace"],
  },
  {
    slug: "cyber-monday",
    name: "Cyber Monday",
    date: "2026-11-30",
    h1: "Top 10 Cyber Monday picks for your desk and your homelab",
    seoTitle: "Top 10 Cyber Monday 2026 Picks for Your Desk & Homelab | Phugialy Deals",
    seoDescription:
      "The 10 desk, computing and gadget products Phugialy readers have been opening most ahead of Cyber Monday 2026. Refreshed daily.",
    intro:
      "Cyber Monday leans toward things you plug in. This list pulls from the computing, desk and gadget products readers have opened most in the last week.",
    sections: ["ai-computing", "desk-workspace", "keyboards-input", "everyday"],
  },
  {
    slug: "christmas-gifts",
    name: "Christmas",
    date: "2026-12-25",
    h1: "Top 10 Christmas gifts for the person who builds with AI",
    seoTitle: "Top 10 Christmas 2026 Gifts for Developers & AI Builders | Phugialy Deals",
    seoDescription:
      "The 10 gifts for developers and AI builders that Phugialy readers have been opening most this season: books, desk gear, gadgets and computing hardware. Refreshed daily.",
    intro:
      "Shopping for someone who codes, writes or builds with AI? These are the books, desk upgrades and small gadgets readers have opened most in the last week.",
    sections: ["books", "everyday", "desk-workspace", "keyboards-input", "ai-computing"],
  },
  {
    slug: "new-year-setup",
    name: "New Year",
    date: "2027-01-01",
    h1: "Top 10 New Year home-office and desk setup upgrades",
    seoTitle: "Top 10 New Year 2027 Home Office & Desk Upgrades | Phugialy Deals",
    seoDescription:
      "The 10 home-office and desk upgrades Phugialy readers have been opening most heading into 2027: monitors, keyboards, webcams and more. Refreshed daily.",
    intro:
      "A new year is a good excuse to fix your desk. These are the monitors, keyboards, webcams and workspace gear readers have opened most in the last week.",
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
  const rest = scored.filter((p) => !pinnedIds.has(p.id)).sort(byActivity);
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
  const inScope = scored.filter((p) => holiday.sections.includes(sectionSlugFor(p.category)));
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
  for (const p of [...inScope].sort(byActivity)) {
    if (taken.length >= n) break;
    if (!taken.some((t) => t.id === p.id)) add(p);
  }
  // If the section caps left the list short, fill from what is left.
  for (const p of [...inScope].sort(byActivity)) {
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
    const fresh = members.filter((p) => !excludeIds.has(p.id)).sort(byActivity);
    const shown = (fresh.length > 0 ? fresh : members.sort(byActivity)).slice(0, perSection);
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
  }));
}

export function filterExplorer(
  items: ExplorerItem[],
  opts: { query?: string; section?: string; sort?: ExplorerSort }
): ExplorerItem[] {
  const terms = (opts.query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const filtered = items.filter((item) => {
    if (opts.section && opts.section !== "all" && item.section !== opts.section) return false;
    if (terms.length === 0) return true;
    const haystack = `${item.name} ${item.category ?? ""} ${item.buy_if ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const sorted = [...filtered];
  if (opts.sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return sorted;
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
