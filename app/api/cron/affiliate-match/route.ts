import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { matchAffiliateProducts, repairAllOrphans } from "@/lib/affiliate";
import { logCronRun } from "@/lib/cron-log";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const backlogResult = await matchAffiliateProducts();
    // Full-catalog orphan check as a defense-in-depth backstop -- the
    // activate/deactivate event hooks handle this in real time now, so this
    // should normally find little to nothing. Kept here instead of a
    // separate cron/schedule since it's cheap and there's no reason to
    // manage a third moving part for a check this infrequently useful.
    const orphanResult = await repairAllOrphans();
    const result = { ...backlogResult, orphanRepair: orphanResult };
    await logCronRun("affiliate-match", true, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logCronRun("affiliate-match", false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
