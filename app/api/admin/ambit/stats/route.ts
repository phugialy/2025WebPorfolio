import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAmbitStats } from "@/lib/ambit-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    return NextResponse.json(await getAmbitStats());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
