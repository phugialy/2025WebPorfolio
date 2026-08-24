import { NextRequest, NextResponse } from "next/server";
import { getActiveAffiliateProduct, logAffiliateClick } from "@/lib/affiliate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getActiveAffiliateProduct(id);

  if (!product) {
    return NextResponse.redirect(new URL("/blog", request.url));
  }

  const articleSlug = request.nextUrl.searchParams.get("ref") || undefined;

  try {
    await logAffiliateClick({
      productId: product.id,
      articleSlug,
      referrer: request.headers.get("referer") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
  } catch (error) {
    console.error("Error logging affiliate click:", error);
  }

  return NextResponse.redirect(product.affiliate_url, { status: 302 });
}
