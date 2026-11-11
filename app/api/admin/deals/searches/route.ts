import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSearchDemand } from "@/lib/deals-search-log";

export const dynamic = "force-dynamic";

// Admin only: what shoppers searched for on Deals and could not find.
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    return NextResponse.json(await getSearchDemand(30));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
