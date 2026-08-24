import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createAffiliateProduct, listAffiliateProducts } from "@/lib/affiliate";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const products = await listAffiliateProducts();
    return NextResponse.json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();

  if (!body.name || !body.affiliateUrl) {
    return NextResponse.json(
      { error: "Missing required fields: name, affiliateUrl" },
      { status: 400 }
    );
  }

  try {
    const product = await createAffiliateProduct({
      name: body.name,
      brand: body.brand,
      network: body.network,
      category: body.category,
      tags: body.tags,
      description: body.description,
      imageUrl: body.imageUrl,
      affiliateUrl: body.affiliateUrl,
      status: body.status,
    });
    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
