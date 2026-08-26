import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getAffiliateProductById,
  getMatchesForProduct,
  updateAffiliateProduct,
} from "@/lib/affiliate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const [product, matches] = await Promise.all([
      getAffiliateProductById(id),
      getMatchesForProduct(id),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product, matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = await request.json();

  if (body.status !== undefined && body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json(
      { error: "status must be 'active' or 'inactive'" },
      { status: 400 }
    );
  }

  try {
    const product = await updateAffiliateProduct(id, body);
    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
