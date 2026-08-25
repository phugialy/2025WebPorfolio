import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { fetchLinkPreview } from "@/lib/link-preview";

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    const preview = await fetchLinkPreview(body.url);
    return NextResponse.json({ preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch link: ${message}` }, { status: 502 });
  }
}
