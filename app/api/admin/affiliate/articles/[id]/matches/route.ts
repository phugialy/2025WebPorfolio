import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { addManualMatch } from "@/lib/affiliate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = await request.json();

  if (!body.productId || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  try {
    await addManualMatch({
      articleId: id,
      productId: body.productId,
      approvedBy: admin.session.user?.email || "admin",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
