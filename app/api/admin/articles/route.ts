import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin config is missing" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, slug, content, status, source_name, canonical_url, tags, quality_score, editorial_score, portfolio_lane, ai_summary, notes, read_time, views, hero_image_url, image_assets, raw_payload, created_at, updated_at, published_at, publish_at"
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data || [] });
}
