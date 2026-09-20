import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Postgres "relation does not exist" -- expected until Phase 0's
// social_posts migration is applied. Treat it as an empty queue rather
// than a hard failure so the page still renders a sane empty state.
const RELATION_DOES_NOT_EXIST = "42P01";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    // Aliased to the frontend's existing field names (draft_copy/final_copy/
    // guardrail_verdict) against the real migration columns (draft_text/
    // final_text/guardrail_review) -- found via a direct diff review after
    // this route and supabase/migrations/0017_social_agent_foundation.sql
    // were built by different concurrent agents and picked different names
    // for the same fields. Aliasing here means queue-board.tsx and this
    // route's own response shape need no changes at all.
    const { data, error } = await supabase
      .from("social_posts")
      .select(
        "id, account_id, platform, status, draft_copy:draft_text, final_copy:final_text, guardrail_verdict:guardrail_review, approved_by, rejection_reason, created_at"
      )
      .eq("status", "guardrail_pending")
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code === RELATION_DOES_NOT_EXIST) {
        return NextResponse.json({ posts: [], migrationPending: true });
      }
      throw error;
    }

    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
