import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { logCronRun } from "@/lib/cron-log";
import { testActive } from "@/lib/deals-test";
import { runDealsTest } from "@/lib/deals-test-run";

// The daily step of the temporary non-tech product test, at 04:30 UTC: half an
// hour before the shelves rotate (05:00), so a product it activates is in the
// first lineup of the day. It does nothing outside Nov 12 - Jan 3, and nothing
// at all while DEALS_TEST=off (the kill switch).
// ?dryRun=1 decides and reports, and changes nothing.
const JOB = "deals-test";

async function handler(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  if (!testActive(Date.now(), process.env.DEALS_TEST)) {
    return NextResponse.json({ ok: true, skipped: "outside the test window, or DEALS_TEST=off" });
  }

  try {
    const result = await runDealsTest({ dryRun });
    const changed = result.plan.activate.length + result.plan.retire.length + result.plan.graduate.length > 0;
    if (!dryRun) {
      if (changed) {
        revalidateTag("deals");
        revalidatePath("/deals");
        revalidatePath("/deals/[holiday]", "page");
      }
      await logCronRun(JOB, true, result);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!dryRun) await logCronRun(JOB, false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
