import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { matchAffiliateProducts } from "@/lib/affiliate";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await matchAffiliateProducts();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
