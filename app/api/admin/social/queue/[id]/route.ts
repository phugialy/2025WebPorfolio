import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type PatchBody = {
  action?: "approve" | "reject" | "edit";
  finalCopy?: string;
  rejectionReason?: string;
  draftCopy?: string;
};

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

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const adminEmail = admin.session.user?.email || "admin";

  // Real migration columns are draft_text/final_text (found via a direct
  // diff review -- this route originally wrote draft_copy/final_copy,
  // matching neither supabase/migrations/0017_social_agent_foundation.sql
  // nor social-agent/pipeline/types.ts, a third naming convention picked
  // independently by whichever agent built this route). The incoming
  // request body's own field names (finalCopy/draftCopy) are unrelated to
  // this and unchanged -- those are queue-board.tsx's choice of JSON keys
  // for its own PATCH payload, not a database column reference.
  let patch: Record<string, unknown>;
  if (body.action === "approve") {
    // Sets the row to `approved` -- Phase 3's publish step is what actually
    // calls the Platform port and moves it to `publishing`/`published`.
    // This route only records the human decision.
    patch = {
      status: "approved",
      approved_by: adminEmail,
      ...(body.finalCopy ? { final_text: body.finalCopy } : {}),
    };
  } else if (body.action === "reject") {
    patch = {
      status: "rejected",
      rejection_reason: body.rejectionReason || null,
      approved_by: adminEmail,
    };
  } else {
    if (!body.draftCopy || !body.draftCopy.trim()) {
      return NextResponse.json({ error: "draftCopy is required for the edit action" }, { status: 400 });
    }
    patch = { draft_text: body.draftCopy };
  }

  try {
    const { error } = await supabase.from("social_posts").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
