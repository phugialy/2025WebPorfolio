import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/articles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}
