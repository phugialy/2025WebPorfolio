import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
