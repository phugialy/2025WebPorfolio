import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getInsta360Stats } from "@/lib/brand-stats";

export const dynamic = "force-dynamic";

// Admin only: how the Insta360 brand page is doing.
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    return NextResponse.json(await getInsta360Stats());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
