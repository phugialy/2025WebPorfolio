import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest, publishDueArticles } from "@/lib/article-automation";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueArticles();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
