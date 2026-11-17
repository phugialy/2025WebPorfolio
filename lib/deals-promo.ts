// Which products the end-of-article "holiday picks" card shows. Pure logic.
//
// The card is a test (see docs/decisions/deals-article-card.md): readers of the
// articles are the audience the site really has, and the card puts one tech pick
// beside two non-tech picks, so every view compares them on the same readers. The
// products are drawn from the holiday that is on now, and the choice rotates by
// article so different articles show different products and more of the list is
// measured.

import { TEST_CATEGORIES } from "./deals-test";
import { hasProductImage } from "./product-images";

export const ARTICLE_PROMO_COUNT = 3;
/** The card needs at least this many products to be worth showing. */
export const ARTICLE_PROMO_MIN = 2;
/** The label the card's links and impressions carry (see isDealsRef). */
export const ARTICLE_PROMO_REF = "catalog-from-article";

type Promoted = { id: string; category: string | null; image_url: string | null };

/** A small stable number from a string, so an article always rotates the same way. */
export function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const rotate = <T,>(list: T[], by: number): T[] => (list.length === 0 ? list : [...list.slice(by % list.length), ...list.slice(0, by % list.length)]);

export function isNonTechCategory(category: string | null): boolean {
  return category !== null && (TEST_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Up to `count` products from a holiday list: one that is not in the non-tech
 * test categories first (what the readers already come for), then the non-tech
 * ones. Products with no real picture are left out. When one kind runs short the
 * other fills in, so the card is full whenever the list has enough products.
 */
export function pickArticlePromo<T extends Promoted>(list: T[], seed: string, count: number = ARTICLE_PROMO_COUNT): T[] {
  const withPhoto = list.filter((p) => hasProductImage(p.image_url));
  const by = seedOf(seed);
  const tech = rotate(withPhoto.filter((p) => !isNonTechCategory(p.category)), by);
  const nonTech = rotate(withPhoto.filter((p) => isNonTechCategory(p.category)), by);
  const picked: T[] = [];
  if (tech.length > 0 && count > 0) picked.push(tech[0]);
  for (const p of nonTech) if (picked.length < count) picked.push(p);
  for (const p of [...tech, ...nonTech]) if (picked.length < count && !picked.includes(p)) picked.push(p);
  return picked.slice(0, count);
}
