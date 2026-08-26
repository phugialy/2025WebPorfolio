import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getArticleLite, getMatchesForArticle } from "@/lib/affiliate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const [article, matches] = await Promise.all([
      getArticleLite(id),
      getMatchesForArticle(id),
    ]);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ article, matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
