import { createSupabaseReadClient } from "@/lib/supabase/server";
import type { AffiliateProduct } from "@/lib/affiliate";
import { AMBIT_BRAND } from "@/lib/ambit-brand";

// Returns the Ambit vendor row only while it is active. Every Ambit placement
// renders through this, so flipping the row to "inactive" in /admin/affiliate
// switches every placement off at once -- the approval gate.
export async function getAmbitPartner(): Promise<AffiliateProduct | null> {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("status", "active")
    .eq("brand", AMBIT_BRAND)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading Ambit partner:", error);
    return null;
  }

  return (data as AffiliateProduct | null) ?? null;
}
