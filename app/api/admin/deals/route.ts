import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listManagerRows } from "@/lib/deals-admin";

export const dynamic = "force-dynamic";

// Admin only: every product that is (or could be) on the Deals pages, with its
// override state, so the manager can show, hide, pin and retag.
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    return NextResponse.json(await listManagerRows());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
