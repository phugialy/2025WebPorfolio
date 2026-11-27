import { unstable_cache } from "next/cache";
import { createSupabaseReadClient } from "@/lib/supabase/server";
import {
  INSTA360_ACCESSORY_GROUPS,
  INSTA360_PICKS,
  storePathOf,
  type AccessoryGroup,
  type BrandAccessory,
  type BrandPick,
} from "@/lib/brands/insta360";

export type BrandProduct = { id: string; name: string; image_url: string | null; affiliate_url: string };
export type BrandCard = BrandPick & { product: BrandProduct };
export type AccessoryCard = BrandAccessory & { product: BrandProduct };
export type AccessoryCardGroup = Omit<AccessoryGroup, "accessories"> & { cards: AccessoryCard[] };

// The active Insta360 store rows, keyed by store path. These rows link to
// Insta360's own store (network "other"), so the Amazon-only Deals lists leave
// them out (isEligible); they appear on the brand page and wherever an article
// is matched to them. Throws on a database error so a failure is never cached.
async function loadInsta360(): Promise<Record<string, BrandProduct>> {
  const read = createSupabaseReadClient();
  if (!read) throw new Error("Brand page: database client unavailable");
  const { data, error } = await read
    .from("affiliate_products")
    .select("id, name, image_url, affiliate_url")
    .eq("status", "active")
    .ilike("affiliate_url", "https://store.insta360.com/product/%");
  if (error) throw new Error(`Brand page: product load failed: ${error.message}`);
  const byPath: Record<string, BrandProduct> = {};
  for (const row of (data ?? []) as BrandProduct[]) {
    const path = storePathOf(row.affiliate_url);
    if (path && !byPath[path]) byPath[path] = row;
  }
  return byPath;
}

const cachedInsta360 = unstable_cache(loadInsta360, ["brand-insta360-v2"], { revalidate: 60 * 60, tags: ["deals", "brand-insta360"] });

async function insta360Rows(): Promise<Record<string, BrandProduct>> {
  try {
    return await cachedInsta360();
  } catch (error) {
    console.error("Brand page:", error instanceof Error ? error.message : error);
    return {};
  }
}

/** The camera picks and the accessory groups that have active catalog rows, in page order. Empty on a database failure. */
export async function getInsta360Page(): Promise<{ cards: BrandCard[]; accessoryGroups: AccessoryCardGroup[] }> {
  const rows = await insta360Rows();
  const cards = INSTA360_PICKS.flatMap((pick) => (rows[pick.storePath] ? [{ ...pick, product: rows[pick.storePath] }] : []));
  const accessoryGroups = INSTA360_ACCESSORY_GROUPS.map(({ accessories, ...group }) => ({
    ...group,
    cards: accessories.flatMap((a) => (rows[a.storePath] ? [{ ...a, product: rows[a.storePath] }] : [])),
  })).filter((g) => g.cards.length > 0);
  return { cards, accessoryGroups };
}
