// Kits: a set of 10 products that belong together (a DJI Osmo vlogging kit, a
// Home AI Lab, a trip, GTA 6), each with its own permanent page at /kits/<slug>.
// Unlike the holiday lists they do not expire, so they are the part of the
// Deals work that stays up after Jan 3.
//
// Pure logic, no database, no "@/" imports: it runs under Vitest with no setup.
// The loading is in lib/kits.ts.
//
// A kit is defined here, in code, and its products are found by Amazon ID (ASIN)
// in the affiliate catalog: the slot says what the product is FOR and which
// listing, the catalog row carries the name, picture and tracked link. A slot
// with no ASIN yet, or whose catalog row is not active, is simply left out of
// the page, so a kit can be defined before every product is in.

export type KitSlot = {
  /** What this product is for in the kit, in a few words ("The camera"). Shown on the card. */
  role: string;
  /** The Amazon listing (10 characters). null until a real listing has been verified. */
  asin: string | null;
};

export type Kit = {
  slug: string;
  /** Short name used on cards and in the hub. */
  name: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  /** One or two plain sentences under the heading. About the kit, no price or discount claims. */
  intro: string;
  /** The article that goes with this kit (its /blog slug), once it is written. */
  articleSlug: string | null;
  /** Light and dark ends of the kit's header gradient; white text sits on top. */
  theme: { accent: string; deep: string };
  slots: KitSlot[];
};

export const KIT_SIZE = 10;
/** A kit is listed on the hub once this many of its products are active. */
export const KIT_MIN_PRODUCTS = 5;

const asins = (...list: (string | null)[]): (string | null)[] => list;
const slots = (roles: string[], ids: (string | null)[]): KitSlot[] => roles.map((role, i) => ({ role, asin: ids[i] ?? null }));

export const KITS: Kit[] = [
  {
    slug: "dji-osmo-vlog-kit",
    name: "DJI Osmo vlogging kit",
    h1: "10 picks to build a DJI Osmo vlogging kit",
    seoTitle: "DJI Osmo Vlogging Kit: 10 Picks to Build Around It | Phugialy",
    seoDescription:
      "The DJI Osmo and nine things to pair with it: memory, power, sound, mounts and a case. A ten-product kit to film trips and everyday life.",
    intro:
      "A small gimbal camera is only the start. The battery runs short on a long shoot, the built-in sound is thin and the footage has to live somewhere: these nine things cover that, with the camera first. Check that each accessory fits your Osmo model.",
    articleSlug: null,
    theme: { accent: "#0E7490", deep: "#083344" },
    slots: slots(
      ["The camera", "Memory card", "Extra power", "Tripod and pole", "Wireless microphone", "Light control", "Carry case", "Wider view", "Footage backup", "Magnetic mount"],
      asins("B0CG19FGQ5", "B082WNC4NK", "B0CHJ1XWHS", "B0F325ZKTC", "B0DDL8WGH5", "B0CM12VVH3", "B0CMHJRB6S", "B0CHJ2MWLP", "B0874YJP92", "B0DQDFNM8L")
    ),
  },
  {
    slug: "gta-6-kit",
    name: "GTA 6 setup",
    h1: "10 picks to get a setup ready for GTA 6, consoles included",
    seoTitle: "GTA 6 Setup: 10 Picks Including Consoles | Phugialy",
    seoDescription:
      "A console, a controller, a screen that can show it well and the storage and cables to go with it: ten products to get ready for GTA 6.",
    intro:
      "GTA 6 is a PS5 and Xbox Series X|S game, so the list starts with the two consoles and their controllers. It is a very large game, so storage matters as much as the screen. Buy for the console you own or plan to buy.",
    articleSlug: null,
    theme: { accent: "#BE185D", deep: "#500724" },
    slots: slots(
      ["PlayStation console", "Xbox console", "PlayStation controller", "Xbox controller", "Headset", "4K TV", "Storage for PlayStation", "Storage for Xbox", "Controller dock", "HDMI cable"],
      asins("B0FRGTYSL5", "B0DCD9LGHY", "B0FY66Q9MP", "B0F1HX3WXX", "B0CYWDPYF4", "B0FTT4GXK4", "B0BHJDY57J", "B0C44XVWCH", "B09B1XX1PN", "B08MZYQ43S")
    ),
  },
  {
    slug: "home-ai-lab-kit",
    name: "Home AI Lab",
    h1: "10 picks to build a Home AI Lab",
    seoTitle: "Home AI Lab: 10 Picks to Run AI at Home | Phugialy",
    seoDescription:
      "A mini PC, a graphics card, fast storage, memory and the network and power gear around them: ten products for running AI models at home.",
    intro:
      "The memory on the graphics card sets which models you can run, so this kit pairs a mini PC with a GPU dock and a card, then adds the storage, network and power gear that keep it running day and night.",
    articleSlug: null,
    theme: { accent: "#4338CA", deep: "#1E1B4B" },
    slots: slots(
      ["The mini PC", "Graphics card", "GPU dock", "Fast storage", "Developer board", "Accelerator", "Network switch", "Battery backup", "Backup drive", "Power meter"],
      asins("B0G7F2TD4W", "B0DS6S98ZF", "B0F9FBN5P5", "B0BHJJ9Y77", "B0BZJTQ5YP", "B07S214S5Y", "B0CMFX748Y", "B06VY6FXMM", "B0874YJP92", "B0D7FQ93QN")
    ),
  },
  {
    slug: "travel-kit",
    name: "Travel kit",
    h1: "10 picks to pack for a trip, DJI Osmo included",
    seoTitle: "Travel Kit: 10 Things to Pack, DJI Osmo Included | Phugialy",
    seoDescription:
      "A carry-on, a camera, power, sound and the small things that keep a trip easy: ten products to pack, with the DJI Osmo for filming it.",
    intro:
      "A good trip kit is light and covers the basics: the bag, the power, something to film with and something to make the flight easier.",
    articleSlug: null,
    theme: { accent: "#B45309", deep: "#431407" },
    slots: slots(
      ["The camera", "Carry-on", "Packing cubes", "Power bank", "Plug adapter", "Headphones", "Neck pillow", "Backpack", "Tracker", "Compact charger"],
      asins("B0CG19FGQ5", "B0FW5PVD5W", "B0B7BFMHNF", "B0DFLNL3XM", "B078S3M2NX", "B0CCZ26B5V", "B0CL9SXSBD", "B07P1SFHK3", "B0GJTXVN9Z", "B08T5QN2TR")
    ),
  },
];

export function getKit(slug: string): Kit | undefined {
  return KITS.find((k) => k.slug === slug);
}

/** The kit that goes with an article, when one is tied to it. */
export function kitForArticle(articleSlug: string): Kit | undefined {
  return KITS.find((k) => k.articleSlug === articleSlug);
}

/** The Amazon listing ID in a product link, or null. */
export function asinOf(url: string | null | undefined): string | null {
  const match = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i.exec(url ?? "");
  return match ? match[1].toUpperCase() : null;
}

/** The label a kit's clicks and impressions carry (accepted by isDealsRef in lib/deals-core.ts). Used as `dealsRef("catalog-kit-<slug>")`. */
export function kitRefSlug(kit: Pick<Kit, "slug">): string {
  return `catalog-kit-${kit.slug}`;
}

export type KitRow = { id: string; affiliate_url: string };

/**
 * The kit's products in slot order. A slot with no ASIN, or whose listing is not
 * among the rows, is skipped; the same product never appears twice. Each result
 * carries the role the slot gave it.
 */
export function orderKitProducts<T extends KitRow>(kit: Kit, rows: T[]): (T & { role: string })[] {
  const byAsin = new Map<string, T>();
  for (const row of rows) {
    const asin = asinOf(row.affiliate_url);
    if (asin && !byAsin.has(asin)) byAsin.set(asin, row);
  }
  const used = new Set<string>();
  const out: (T & { role: string })[] = [];
  for (const slot of kit.slots) {
    if (!slot.asin) continue;
    const row = byAsin.get(slot.asin.toUpperCase());
    if (!row || used.has(row.id)) continue;
    used.add(row.id);
    out.push({ ...row, role: slot.role });
  }
  return out;
}

/** True when the kit has enough active products to be listed. */
export function kitIsReady(productCount: number): boolean {
  return productCount >= KIT_MIN_PRODUCTS;
}
