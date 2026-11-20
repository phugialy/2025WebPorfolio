import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/server";
import { attachFacts, isEligible, type DealsProduct, type FactsRow } from "@/lib/deals-core";
import { KITS, getKit, kitIsReady, orderKitProducts, type Kit } from "@/lib/kits-core";

export type KitProduct = DealsProduct & { affiliate_url: string; role: string };

// One kit's active products, in slot order, with card facts when the holiday
// guide engine has written them. Throws on a database error so a failure is never
// cached; the public wrapper below turns it into an empty kit for that render.
async function loadKit(slug: string): Promise<KitProduct[]> {
  const kit = getKit(slug);
  if (!kit) return [];
  const asins = kit.slots.map((s) => s.asin).filter((a): a is string => Boolean(a));
  if (asins.length === 0) return [];

  const read = createSupabaseReadClient();
  if (!read) throw new Error("Kits: database client unavailable");
  const { data, error } = await read
    .from("affiliate_products")
    .select("id, name, category, image_url, description, buy_if, skip_if, is_partner, flag_reason, affiliate_url, created_at")
    .eq("status", "active")
    .or(asins.map((a) => `affiliate_url.ilike.*/dp/${a}*`).join(","));
  if (error) throw new Error(`Kits: product load failed: ${error.message}`);

  const rows = ((data ?? []) as (DealsProduct & { affiliate_url: string })[]).filter((p) => isEligible(p));
  const ordered = orderKitProducts(kit, rows);

  // Card facts (what it is, who it is for, the catch). Missing table or rows just means
  // the cards fall back to the product's own text.
  const admin = createSupabaseAdminClient();
  let factsRows: FactsRow[] | null = null;
  if (admin && ordered.length > 0) {
    const { data: facts, error: factsError } = await admin
      .from("deals_product_facts")
      .select(
        "product_id, what_it_is, best_for, buy_if, skip_if, strengths, caveats, key_specs, price_class, verdict, confidence, evidence_count, evidence_newest, verified_at, guide_slug"
      )
      .in("product_id", ordered.map((p) => p.id));
    if (factsError) console.warn("Kits: deals_product_facts unavailable, cards use product text:", factsError.message);
    else factsRows = (facts || []) as FactsRow[];
  }
  return attachFacts(ordered, factsRows) as KitProduct[];
}

const cachedKit = unstable_cache(loadKit, ["kit-products-v1"], { revalidate: 60 * 60, tags: ["kits", "deals"] });

/** A kit's active products in slot order. Empty on a database failure (and not cached then). */
export async function getKitProducts(slug: string): Promise<KitProduct[]> {
  try {
    return await cachedKit(slug);
  } catch (error) {
    console.error("Kits:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** The kits that have enough active products to be listed, each with its products. */
export async function getReadyKits(): Promise<{ kit: Kit; products: KitProduct[] }[]> {
  const loaded = await Promise.all(KITS.map(async (kit) => ({ kit, products: await getKitProducts(kit.slug) })));
  return loaded.filter((k) => kitIsReady(k.products.length));
}
