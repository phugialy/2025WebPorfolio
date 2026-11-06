import { NextRequest, NextResponse } from "next/server";
import { logAffiliateImpressions } from "@/lib/affiliate";
import { isDealsRef } from "@/lib/deals-core";
import { createSupabaseReadClient } from "@/lib/supabase/server";

// Receives batches of "this product card was on screen" from the Deals pages.
// Public by necessity, so it stays narrow: a small batch, labels the pages can
// really produce, and only products that are active right now. Anything else
// is dropped quietly, so nothing can add made-up rows to the numbers.
const MAX_ITEMS = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const list = (body as { impressions?: unknown } | null)?.impressions;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_ITEMS) {
    return new NextResponse(null, { status: 400 });
  }

  const wanted: Array<{ productId: string; ref: string }> = [];
  for (const entry of list) {
    const { productId, ref } = (entry ?? {}) as { productId?: unknown; ref?: unknown };
    if (typeof productId !== "string" || !UUID.test(productId) || !isDealsRef(ref)) {
      return new NextResponse(null, { status: 400 });
    }
    wanted.push({ productId, ref });
  }

  const supabase = createSupabaseReadClient();
  if (!supabase) return new NextResponse(null, { status: 204 });

  const ids = [...new Set(wanted.map((item) => item.productId))];
  const { data, error } = await supabase.from("affiliate_products").select("id").eq("status", "active").in("id", ids);
  if (error) {
    console.error("Deals tracking: product lookup failed:", error);
    return new NextResponse(null, { status: 204 });
  }
  const active = new Set((data ?? []).map((row: { id: string }) => row.id));

  try {
    await logAffiliateImpressions(
      wanted.filter((item) => active.has(item.productId)).map((item) => ({ productId: item.productId, articleSlug: item.ref })),
      request.headers.get("user-agent") || undefined
    );
  } catch (insertError) {
    console.error("Deals tracking: impression insert failed:", insertError);
  }

  return new NextResponse(null, { status: 204 });
}
