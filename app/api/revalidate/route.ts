import { NextRequest, NextResponse } from "next/server";
import { revalidateArticles } from "@/lib/articles";

// Makes a newly published or edited article show at once instead of within the
// cache window (15 minutes). The V1 publisher writes straight to Supabase, so it
// can call this after a publish:
//   POST /api/revalidate    header  x-api-key: <BLOG_INGEST_API_KEY or CRON_SECRET>
// It clears the article caches only; it reads nothing from the database itself.
export function isAuthorizedRevalidate(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const keys = [env.BLOG_INGEST_API_KEY, env.CRON_SECRET, env.BLOG_CRON_SECRET].filter((k): k is string => Boolean(k));
  if (keys.length === 0) return false;
  const bearer = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");
  return keys.some((key) => apiKey === key || bearer === `Bearer ${key}`);
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRevalidate(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidateArticles();
  return NextResponse.json({ ok: true, cleared: "articles" });
}
