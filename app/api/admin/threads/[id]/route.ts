import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { deleteThread, setThreadStatus, updateThread } from "@/lib/threads";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const requestBody = await request.json();

  // Two calling shapes hit this route: the publish/unpublish toggle
  // (`{ status }` only) and the edit form (title/body/tags/articleIds,
  // status optional). Handle content edits first so a request that
  // includes `body` doesn't get rejected for lacking a bare `status`.
  const hasContentFields =
    requestBody.title !== undefined ||
    requestBody.body !== undefined ||
    requestBody.tags !== undefined ||
    requestBody.articleIds !== undefined;

  if (hasContentFields) {
    if (requestBody.body !== undefined && !String(requestBody.body).trim()) {
      return NextResponse.json({ error: "Missing required field: body" }, { status: 400 });
    }

    try {
      await updateThread(id, {
        title: requestBody.title,
        body: requestBody.body,
        tags: requestBody.tags,
        articleIds: requestBody.articleIds,
      });
      if (requestBody.status === "draft" || requestBody.status === "published") {
        await setThreadStatus(id, requestBody.status);
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (requestBody.status !== "draft" && requestBody.status !== "published") {
    return NextResponse.json({ error: "status must be 'draft' or 'published'" }, { status: 400 });
  }

  try {
    await setThreadStatus(id, requestBody.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  try {
    await deleteThread(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
