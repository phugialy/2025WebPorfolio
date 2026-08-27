import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  approveMatch,
  rejectMatch,
  setMatchActive,
  setPlacementContextNote,
} from "@/lib/affiliate";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  // Empty body = approve (quick-triage default action); { isActive } = the
  // deactivate/reactivate toggle; { contextNote } = the "why is this here"
  // note shown on the public Pick card. All from the Placements table.
  const rawBody = await request.text();
  const body = rawBody ? JSON.parse(rawBody) : {};

  try {
    if (typeof body.isActive === "boolean") {
      await setMatchActive(id, body.isActive);
    } else if (typeof body.contextNote === "string") {
      await setPlacementContextNote(id, body.contextNote || null);
    } else {
      await approveMatch(id, admin.session.user?.email || "admin");
    }
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
    await rejectMatch(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
