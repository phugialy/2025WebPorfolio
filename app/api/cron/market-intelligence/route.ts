import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { discoverTrendingByCategory } from "@/lib/market-intelligence";
import { logCronRun } from "@/lib/cron-log";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dryRun=1: real search and real model judgment, but nothing is inserted
  // and no log row is written.
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const result = await discoverTrendingByCategory(Date.now(), { dryRun });
    if (!dryRun) await logCronRun("market-intelligence", true, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!dryRun) await logCronRun("market-intelligence", false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
