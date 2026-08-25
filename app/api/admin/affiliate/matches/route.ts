import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listAllMatches, listPendingMatches } from "@/lib/affiliate";

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const wantAll = request.nextUrl.searchParams.get("status") === "all";

  try {
    const matches = wantAll ? await listAllMatches() : await listPendingMatches();
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
