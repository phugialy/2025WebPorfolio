import { NextResponse } from "next/server";
import { getAllPostsOrThrow } from "@/lib/articles";

// The article list for the blog and home pages: slimmed (see lib/articles.ts) and
// kept for 15 minutes at the edge, so a newly published article shows within that.
// A failed read throws, which never replaces the last good response with an empty list.
export const revalidate = 900;

export async function GET() {
  const posts = await getAllPostsOrThrow();
  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
