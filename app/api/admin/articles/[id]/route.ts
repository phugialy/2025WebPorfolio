import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const allowedStatuses = new Set([
  "draft",
  "new",
  "reviewed",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "archived",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = await request.json();
  const nextStatus = typeof body.status === "string" ? body.status : undefined;

  if (nextStatus && !allowedStatuses.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid article status" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin config is missing" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
  };

  if (nextStatus) {
    update.status = nextStatus;
  }

  if (typeof body.title === "string") {
    update.title = body.title;
  }

  if (typeof body.content === "string") {
    update.content = body.content;
  }

  if (typeof body.aiSummary === "string") {
    update.ai_summary = body.aiSummary;
  }

  if (typeof body.notes === "string") {
    update.notes = body.notes;
  }

  if (typeof body.editorialScore === "number") {
    update.editorial_score = body.editorialScore;
  }

  if (nextStatus === "published") {
    update.published_at = now;
    update.publish_at = null;
  }

  if (nextStatus === "scheduled" && typeof body.publishAt === "string") {
    update.publish_at = body.publishAt;
  }

  const { data, error } = await supabase
    .from("articles")
    .update(update)
    .eq("id", id)
    .select(
      "id, title, slug, content, status, source_name, canonical_url, tags, quality_score, editorial_score, portfolio_lane, ai_summary, notes, read_time, views, hero_image_url, image_assets, raw_payload, created_at, updated_at, published_at, publish_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ article: data });
}
