// The Insta360 brand page (/deals/insta360): what each product is for, when it
// is a good buy and when it is not, and the market numbers behind the page.
//
// Pure data and arithmetic, no database and no "@/" imports, so it runs under
// Vitest with no setup. The catalog rows (name, picture, tracked link) are
// loaded in lib/brand-pages.ts and matched to these entries by the store path
// in their link (store.insta360.com/product/<storePath>).
//
// Every claim here comes from the official store page or from the reviews
// linked next to it, read on Nov 27 2026. No prices or discounts: those change
// daily and the store shows them.

import { BRAND_TRENDS, type TrendRow } from "./insta360-trends";

export const INSTA360_REF_SLUG = "brand-insta360"; // tracked as deals-brand-insta360
export const INSTA360_CHECKED = "Nov 27, 2026";

export type Source = { label: string; url: string };

export type BrandPick = {
  /** The path after store.insta360.com/product/ in the catalog row's link. */
  storePath: string;
  /** Shown as the card title (the catalog row's own name is the long store title). */
  title: string;
  /** What it is for, in a few words. */
  role: string;
  /** One plain sentence: what it is, from the store page. */
  what: string;
  goodIf: string;
  skipIf: string;
  /** What independent reviewers agree on, in our words. */
  reviewers: string;
  sources: Source[];
};

export type PickGroup = { id: string; heading: string; intro: string; picks: BrandPick[] };

export const INSTA360_GROUPS: PickGroup[] = [
  {
    id: "360-cameras",
    heading: "360 cameras",
    intro:
      "This is what Insta360 is known for: film everything around you, choose the angle later, and the selfie stick disappears from the shot.",
    picks: [
      {
        storePath: "x5",
        title: "Insta360 X5",
        role: "Best value 360",
        what: "An 8K 360 camera with replaceable lenses, waterproof, with a low-light video mode.",
        goodIf: "It is your first 360 camera, or you are coming from an X3 or older.",
        skipIf: "You film mostly at night and can stretch to the X6.",
        reviewers:
          "Reviewers who tested both still point most people to the X5 for the balance of price and quality, and say X5 owners do not need the X6.",
        sources: [
          { label: "Tom's Guide", url: "https://www.tomsguide.com/cameras-photography/gopro-action-cameras/insta360-x6-review" },
          { label: "Notebookcheck", url: "https://www.notebookcheck.net/Insta360-X6-Review-A-near-perfect-360-camera-with-a-wild-price-tag.1395004.0.html" },
        ],
      },
      {
        storePath: "x6",
        title: "Insta360 X6",
        role: "Best 360 in low light",
        what: "The newest flagship: 8K 360 video from two larger 1/1.1-inch sensors, and 120MP 360 photos.",
        goodIf: "You film after dark, or you are upgrading from an X4 or older.",
        skipIf: "You already own an X5: the gain in good light is small, and X5 cases and batteries do not fit.",
        reviewers:
          "The clearest gain over the X5 is low light. Reviewers call it the best small 360 camera and also the most expensive one.",
        sources: [
          { label: "TechRadar", url: "https://techradar.com/cameras/360-cameras/insta360-x6-review" },
          { label: "Shotkit", url: "https://shotkit.com/insta360-x6-review/" },
        ],
      },
      {
        storePath: "x4-air",
        title: "Insta360 X4 Air",
        role: "Lightest 360",
        what: "The lightest camera in the X series at 165g, 8K 360, waterproof to 49ft.",
        goodIf: "Weight and a lower price matter more than the last bit of quality.",
        skipIf: "You shoot long days or in the dark: the battery and screen are smaller than the X5's.",
        reviewers:
          "Compact and well built with strong daylight images; reviewers note the smaller battery, the cramped screen and photos capped at 29MP.",
        sources: [
          { label: "TechRadar", url: "https://www.techradar.com/cameras/360-cameras/insta360-x4-air-review" },
          { label: "Digital Camera World", url: "https://www.digitalcameraworld.com/cameras/360-cameras/insta360-x4-air-review" },
        ],
      },
    ],
  },
  {
    id: "vlogging",
    heading: "Pocket vlogging",
    intro:
      "DJI's newest Osmo Pocket is not officially sold in the US. Insta360's Luna series is, and reviewers compare it with DJI directly.",
    picks: [
      {
        storePath: "luna-series",
        title: "Insta360 Luna Pro / Luna Ultra",
        role: "Pocket gimbal camera",
        what: "8K pocket gimbal cameras with Leica lenses, 1-inch sensors and AI tracking. The Ultra adds a second 3x zoom camera.",
        goodIf: "You want a pocket gimbal for vlogging and you buy in the US.",
        skipIf: "You already have an Osmo Pocket 3 that works for you: see our Pocket 3 kit instead.",
        reviewers:
          "Engadget scored the Luna Pro 9.3/10 and the Ultra 8.7/10. TechRadar found the Pro's main rival is its own Ultra, since the prices are close.",
        sources: [
          { label: "Engadget (Pro)", url: "https://engadget.com/2253274/insta360-luna-pro-review/" },
          { label: "Engadget (Ultra)", url: "https://engadget.com/2195199/insta360-luna-ultra-review" },
          { label: "RedShark News", url: "https://www.redsharknews.com/insta360-luna-pro-global-launch-price-us" },
        ],
      },
    ],
  },
  {
    id: "action",
    heading: "Action and hands-free",
    intro: "A straight fight with GoPro and DJI. Here Insta360 is a close call, not a clear winner.",
    picks: [
      {
        storePath: "ace-pro-2",
        title: "Insta360 Ace Pro 2",
        role: "Action camera",
        what: "An 8K action camera with a Leica lens, 4K up to 120fps, a flip-up screen, waterproof to 39ft.",
        goodIf: "You want the flip screen for filming yourself, and detail in dark scenes.",
        skipIf: "The smallest possible camera matters most: it is larger than its GoPro and DJI rivals.",
        reviewers:
          "Reviewers put it level with the GoPro Hero 13 Black and DJI Osmo Action 5 Pro: better screen and low-light detail, bigger body.",
        sources: [
          { label: "TechRadar", url: "https://www.techradar.com/cameras/action-cameras/insta360-ace-pro-2-review" },
          { label: "DroneXL", url: "https://dronexl.co/2024/11/18/insta360-ace-pro-2-dji-action-5-pro-gopro-13" },
        ],
      },
      {
        storePath: "go-ultra",
        title: "Insta360 GO Ultra",
        role: "Tiny POV camera",
        what: "A 53g 4K60 camera that clips to a helmet, a cap or a bike for hands-free point-of-view video.",
        goodIf: "You want a camera you forget you are wearing: cycling, kids, everyday POV.",
        skipIf: "Image quality comes first: the Ace Pro 2 is sharper.",
        reviewers:
          "Called the most capable GO yet; reviewers flag a price close to the Ace Pro 2, softer images than it, and some app issues.",
        sources: [
          { label: "T3", url: "https://www.t3.com/tech/gopro-action-cameras/insta360-go-ultra-review" },
          { label: "Tom's Guide", url: "https://www.tomsguide.com/cameras-photography/gopro-action-cameras/insta360-go-ultra-review" },
        ],
      },
    ],
  },
  {
    id: "phone-and-desk",
    heading: "For your phone and your desk",
    intro: "Smaller buys. We read the store pages; independent reviews were thin, so these carry less weight.",
    picks: [
      {
        storePath: "flow-2-pro",
        title: "Insta360 Flow 2 Series",
        role: "Phone gimbal",
        what: "A phone gimbal with AI tracking, a built-in selfie stick and tripod, and Apple DockKit support.",
        goodIf: "You film on your phone and want smooth, self-following shots.",
        skipIf: "You want a camera, not a phone accessory.",
        reviewers: "Few independent reviews yet; one Japanese review describes it as easier to use after many small improvements.",
        sources: [{ label: "Insta360 store", url: "https://store.insta360.com/product/flow-2-pro" }],
      },
      {
        storePath: "link-2-pro",
        title: "Insta360 Link 2 Pro",
        role: "4K webcam",
        what: "A 4K webcam on a small gimbal with a 1/1.3-inch sensor, AI tracking and noise reduction.",
        goodIf: "You stream or teach and want the camera to follow you.",
        skipIf: "You only join calls: a plain webcam does the job.",
        reviewers: "We have not read an independent review of this model yet; the facts above are the store's.",
        sources: [{ label: "Insta360 store", url: "https://store.insta360.com/product/link-2-pro" }],
      },
      {
        storePath: "mic-air",
        title: "Insta360 Mic Air",
        role: "Clip-on mic",
        what: "A 7.9g wireless clip-on mic with noise reduction and a 300m range.",
        goodIf: "Your camera's built-in sound is the weak spot.",
        skipIf: "You already use a wireless mic system you like.",
        reviewers: "We have not read an independent review of this model yet; the facts above are the store's.",
        sources: [{ label: "Insta360 store", url: "https://store.insta360.com/product/mic-air" }],
      },
    ],
  },
];

export const INSTA360_PICKS: BrandPick[] = INSTA360_GROUPS.flatMap((g) => g.picks);

/** The store path in an Insta360 store link, or null. */
export function storePathOf(url: string | null | undefined): string | null {
  const match = /^https:\/\/store\.insta360\.com\/product\/([a-z0-9-]+)(?:[/?#]|$)/i.exec(url ?? "");
  return match ? match[1].toLowerCase() : null;
}

// --- Market numbers, computed from the trend rows so the page and the data agree ---

const SERIES = { insta360: 1, gopro: 2, djiOsmo: 3 } as const;
type SeriesKey = keyof typeof SERIES;

const avg = (rows: TrendRow[], key: SeriesKey) =>
  rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row[SERIES[key]], 0) / rows.length;

/** November and December interest against the whole calendar year (1.0 = no holiday lift). */
export function holidayLift(year: number, key: SeriesKey, rows: TrendRow[] = BRAND_TRENDS): number | null {
  const months = rows.filter((r) => r[0].startsWith(`${year}-`));
  if (months.length < 12) return null;
  const holiday = months.filter((r) => r[0].endsWith("-11") || r[0].endsWith("-12"));
  const yearly = avg(months, key);
  return yearly > 0 ? avg(holiday, key) / yearly : null;
}

/** Insta360's September to November interest as a share of another brand's, for one year. */
export function fallShare(year: number, versus: Exclude<SeriesKey, "insta360">, rows: TrendRow[] = BRAND_TRENDS): number | null {
  const fall = rows.filter((r) => [`${year}-09`, `${year}-10`, `${year}-11`].includes(r[0]));
  if (fall.length < 3) return null;
  const other = avg(fall, versus);
  return other > 0 ? avg(fall, "insta360") / other : null;
}

/** The busiest month of a year for one brand ("2025-12"). */
export function busiestMonth(year: number, key: SeriesKey, rows: TrendRow[] = BRAND_TRENDS): string | null {
  const months = rows.filter((r) => r[0].startsWith(`${year}-`));
  if (months.length === 0) return null;
  return months.reduce((best, r) => (r[SERIES[key]] > best[SERIES[key]] ? r : best))[0];
}

export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "1.43x" */
export const times = (n: number | null) => (n === null ? "n/a" : `${n.toFixed(2)}x`);
/** "63%" */
export const percent = (n: number | null) => (n === null ? "n/a" : `${Math.round(n * 100)}%`);

export const MARKET_SOURCES: Record<string, Source> = {
  trends: { label: "Google Trends, US web search, pulled Nov 27 2026", url: "https://trends.google.com/trends/explore?date=today%205-y&geo=US&q=insta360,gopro,dji%20osmo" },
  share: { label: "Frost & Sullivan 2023 figure, cited in IPO coverage (36Kr)", url: "https://eu.36kr.com/en/p/3337899315456262" },
  ipo: { label: "South China Morning Post", url: "https://www.scmp.com/tech/tech-trends/article/3313956/chinese-gopro-rival-insta360-sees-strong-debut-shanghai-ipo-firm-eyes-expansion" },
  itc: { label: "PetaPixel", url: "https://petapixel.com/2026/02/27/us-itc-rules-insta360-did-not-infringe-gopros-utility-patents" },
  itc2: { label: "TechNode", url: "https://technode.com/2026/02/28/us-itc-clears-insta360-in-gopro-section-337-investigation/" },
  launches: { label: "GoPro investor relations", url: "https://investor.gopro.com/press-releases/press-release-details/2026/GoPro-Announces-New-MISSION-1-Line-of-Professional-8K-and-4K-Open-Gate-Compact-Cinema-Cameras-for-Filmmakers-Creators-and-Aspiring-Enthusiasts/default.aspx" },
};
