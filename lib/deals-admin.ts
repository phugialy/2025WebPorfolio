import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  applyCategoryOverrides,
  buildManagerRows,
  dropBooks,
  isEligible,
  type CatalogRow,
  type DealsProduct,
  type ManagerRow,
  type OverrideValues,
} from "@/lib/deals-core";

// Server side of the /admin/deals manager. Reads and writes the deals_catalog
// overrides with the service-role key (the table has no public policy).

const TABLE_HINT = "The deals_catalog table is missing. Run supabase/migrations/0023_deals_catalog.sql in the Supabase SQL Editor first.";

export class DealsAdminError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

function client() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new DealsAdminError("The database is not configured on the server.");
  return admin;
}

// What the public pages use: the same eligibility rules as lib/deals.ts.
async function loadEligibleProducts(): Promise<DealsProduct[]> {
  const { data, error } = await client()
    .from("affiliate_products")
    .select("id, name, category, image_url, description, buy_if, is_partner, flag_reason")
    .eq("status", "active");
  if (error) throw new DealsAdminError(error.message);
  const rows = (data || []) as DealsProduct[];
  return dropBooks(applyCategoryOverrides(rows.filter((p) => isEligible(p))));
}

export async function listManagerRows(): Promise<{ rows: ManagerRow[]; catalogReady: boolean }> {
  const products = await loadEligibleProducts();
  const { data, error } = await client().from("deals_catalog").select("product_id, tags, pinned_rank, hidden");
  if (error) return { rows: buildManagerRows(products, null), catalogReady: false };
  return { rows: buildManagerRows(products, (data || []) as CatalogRow[]), catalogReady: true };
}

// The public pages cache their data for 6 hours; this makes a change show now.
function refreshDealsPages() {
  revalidateTag("deals");
  revalidatePath("/deals");
  revalidatePath("/deals/[holiday]", "page");
}

export async function saveOverride(productId: string, values: OverrideValues): Promise<void> {
  const admin = client();
  const { data: product, error: lookupError } = await admin
    .from("affiliate_products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (lookupError) throw new DealsAdminError(lookupError.message);
  if (!product) throw new DealsAdminError("That product does not exist.", 404);

  const { error } = await admin
    .from("deals_catalog")
    .upsert({ product_id: productId, ...values, updated_at: new Date().toISOString() }, { onConflict: "product_id" });
  if (error) throw new DealsAdminError(/deals_catalog/.test(error.message) ? TABLE_HINT : error.message);
  refreshDealsPages();
}

// Back to automatic: the product follows its category tags again.
export async function resetOverride(productId: string): Promise<void> {
  const { error } = await client().from("deals_catalog").delete().eq("product_id", productId);
  if (error) throw new DealsAdminError(/deals_catalog/.test(error.message) ? TABLE_HINT : error.message);
  refreshDealsPages();
}
