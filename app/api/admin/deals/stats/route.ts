import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getDealsStats } from "@/lib/deals-stats";

export const dynamic = "force-dynamic";

// Admin only: how each part of the Deals pages is performing.
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    return NextResponse.json(await getDealsStats());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
