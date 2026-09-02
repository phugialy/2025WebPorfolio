import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { setReplyStatus } from "@/lib/thread-replies";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (!["visible", "hidden", "removed"].includes(body.status)) {
    return NextResponse.json({ error: "status must be visible, hidden, or removed" }, { status: 400 });
  }

  try {
    await setReplyStatus(id, body.status, admin.session.user?.email || "admin");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
