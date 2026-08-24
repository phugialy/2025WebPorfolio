import { NextRequest, NextResponse } from "next/server";
import {
  isAuthorizedCronRequest,
  prepareMissingArticleImages,
} from "@/lib/article-automation";

async function handler(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prepareMissingArticleImages();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
