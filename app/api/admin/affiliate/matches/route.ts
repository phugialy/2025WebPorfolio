import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listPendingMatches } from "@/lib/affiliate";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const matches = await listPendingMatches();
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
