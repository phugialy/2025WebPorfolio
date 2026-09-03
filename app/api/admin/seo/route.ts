import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSeoAudit } from "@/lib/seo-audit";

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const days = Number(request.nextUrl.searchParams.get("days")) || 90;

  try {
    const report = await getSeoAudit(days);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
