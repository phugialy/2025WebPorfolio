import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { setProfileStatus } from "@/lib/profiles";

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json().catch(() => ({}));

  if (typeof body.email !== "string" || !body.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (!["active", "muted", "banned"].includes(body.status)) {
    return NextResponse.json({ error: "status must be active, muted, or banned" }, { status: 400 });
  }

  try {
    await setProfileStatus(body.email, body.status, admin.session.user?.email || "admin");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
