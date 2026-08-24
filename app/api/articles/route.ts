import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/articles";

export const revalidate = 300;

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
