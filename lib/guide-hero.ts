import { DEALS_TAG } from "@/lib/deals-core";

// Holiday buying guides arrive without a picture, so their pages, the blog and
// Deals cards, and every shared link fell back to the generic site card. Each
// guide gets a drawn cover instead: the guide's title on the brand's dark
// ground with a line drawing of the product kind. It is our own artwork, so no
// store photo is copied, cropped or re-hosted (Amazon's terms forbid that).
// A real hero image set on the article always wins.

export type GuideHeroKind = "monitor" | "mini-pc" | "keyboard" | "headphones" | "webcam" | "camera" | "generic";

// Bump when the drawing changes: the image is served with a year-long cache.
export const GUIDE_HERO_VERSION = "1";

const KIND_BY_TAG: Array<[RegExp, GuideHeroKind]> = [
  [/^(monitors?|curved-monitors|ultrawide-monitors)$/, "monitor"],
  [/^(mini-pcs?|local-ai)$/, "mini-pc"],
  [/^(keyboards?|ergonomic-keyboards|split-layout)$/, "keyboard"],
  [/^(headphones|over-ear-headphones|noise-cancelling|earbuds)$/, "headphones"],
  [/^(webcams?|4k-webcams)$/, "webcam"],
  [/^(cameras?|action-cameras?|vlogging)$/, "camera"],
];

/** The product kind drawn on a guide's cover, from its tags; "generic" when none match. */
export function guideHeroKind(tags: readonly string[]): GuideHeroKind {
  for (const [pattern, kind] of KIND_BY_TAG) {
    if (tags.some((tag) => pattern.test(tag.toLowerCase()))) return kind;
  }
  return "generic";
}

export function isGuide(tags: readonly string[] | null | undefined): boolean {
  return Array.isArray(tags) && tags.includes(DEALS_TAG);
}

/** The drawn cover's path for a guide (relative; metadataBase makes it absolute for link previews). */
export function guideHeroPath(slug: string): string {
  return `/api/guide-hero/${encodeURIComponent(slug)}?v=${GUIDE_HERO_VERSION}`;
}

/** The drawing alone (4:3), for thumbnail slots too narrow for the titled cover. */
export function guideMarkPath(slug: string): string {
  return `${guideHeroPath(slug)}&mark=1`;
}

/** The article's own hero image, or the drawn cover for a guide that has none. */
export function heroWithGuideCover(
  heroUrl: string | null | undefined,
  slug: string,
  tags: readonly string[] | null | undefined
): { url: string | undefined; isCover: boolean } {
  if (heroUrl) return { url: heroUrl, isCover: false };
  if (isGuide(tags)) return { url: guideHeroPath(slug), isCover: true };
  return { url: undefined, isCover: false };
}
