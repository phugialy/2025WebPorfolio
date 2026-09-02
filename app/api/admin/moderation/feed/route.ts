import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listRecentRepliesForModeration } from "@/lib/thread-replies";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const replies = await listRecentRepliesForModeration();
    return NextResponse.json({ replies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
