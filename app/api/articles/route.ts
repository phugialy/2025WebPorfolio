import { NextResponse } from "next/server";
import { getAllPostsOrThrow } from "@/lib/articles";

// The article list for the blog and home pages: slimmed (see lib/articles.ts) and
// kept for an hour at the edge. A failed read throws, which never replaces the
// last good response with an empty list.
export const revalidate = 3600;

export async function GET() {
  const posts = await getAllPostsOrThrow();
  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
