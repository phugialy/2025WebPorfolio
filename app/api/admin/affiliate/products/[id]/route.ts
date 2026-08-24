import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { setAffiliateProductStatus } from "@/lib/affiliate";

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

  if (body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json(
      { error: "status must be 'active' or 'inactive'" },
      { status: 400 }
    );
  }

  try {
    await setAffiliateProductStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
