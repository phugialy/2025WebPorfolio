import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { applyQueueAction, type QueueAction } from "@/app/api/mcp/social/queue-shared";

type PatchBody = {
  action?: QueueAction;
  finalCopy?: string;
  rejectionReason?: string;
  draftCopy?: string;
};

// Narrow, allowed exception to the "don't touch app/api/admin/social/*"
// scope for the social-agent MCP build: the actual approve/reject/edit
// patch logic (previously inlined here) moved to
// app/api/mcp/social/queue-shared.ts's `applyQueueAction`, so Hippo-Assist's
// approve_post/reject_post/edit_post MCP tools and this admin route apply
// the exact same logic instead of two copies that could drift. Everything
// else here -- admin-session auth, request parsing, response shape -- is
// unchanged.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  if (!body.action || !["approve", "reject", "edit"].includes(body.action)) {
    return NextResponse.json({ error: "action must be approve, reject, or edit" }, { status: 400 });
  }

  const adminEmail = admin.session.user?.email || "admin";

  const result = await applyQueueAction(
    id,
    { action: body.action, finalCopy: body.finalCopy, rejectionReason: body.rejectionReason, draftCopy: body.draftCopy },
    adminEmail
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
