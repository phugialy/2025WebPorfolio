import { NextRequest, NextResponse } from "next/server";
import { revalidateArticles } from "@/lib/articles";
import { isAuthorizedRevalidate } from "@/lib/revalidate-auth";

// Makes a newly published or edited article show at once instead of within the
// cache window (15 minutes). The V1 publisher writes straight to Supabase, so it
// can call this after a publish:
//   POST /api/revalidate    header  x-api-key: <BLOG_INGEST_API_KEY or CRON_SECRET>
// It clears the article caches only; it reads nothing from the database itself.
export async function POST(request: NextRequest) {
  if (!isAuthorizedRevalidate(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidateArticles();
  return NextResponse.json({ ok: true, cleared: "articles" });
}
