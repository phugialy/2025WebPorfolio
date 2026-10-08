import { NextRequest, NextResponse } from "next/server";
import { getActiveAffiliateProduct, logAffiliateImpression } from "@/lib/affiliate";

// Public by necessity (it's called from the visitor's browser), so it's kept
// narrow: a closed allowlist of placement labels, and only for products that
// are currently active -- nothing can write arbitrary labels or poison the
// numbers for a product that isn't live.
const ALLOWED_REFS = new Set(["blog-index-ambit"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { productId, ref } = (body ?? {}) as { productId?: unknown; ref?: unknown };
  if (typeof productId !== "string" || !UUID.test(productId)) {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof ref !== "string" || !ALLOWED_REFS.has(ref)) {
    return new NextResponse(null, { status: 400 });
  }

  const product = await getActiveAffiliateProduct(productId);
  if (!product) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await logAffiliateImpression({
      productId: product.id,
      articleSlug: ref,
      userAgent: request.headers.get("user-agent") || undefined,
    });
  } catch (error) {
    console.error("Error logging impression:", error);
  }

  return new NextResponse(null, { status: 204 });
}
