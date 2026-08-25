import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createThread, listAllThreads } from "@/lib/threads";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const threads = await listAllThreads();
    return NextResponse.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  if (!body.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Missing required field: body" }, { status: 400 });
  }

  try {
    const thread = await createThread({
      title: body.title,
      body: body.body,
      tags: body.tags,
      resourceId: body.resourceId,
      status: body.status,
    });
    return NextResponse.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
