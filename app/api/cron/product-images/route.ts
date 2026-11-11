import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { runImageEngine } from "@/lib/image-engine";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logCronRun } from "@/lib/cron-log";

// Daily product picture repair (lib/image-engine.ts). ?dryRun=1 does the real
// fetches and checks but changes and logs nothing.
const JOB = "product-images";

export const maxDuration = 60;

async function handler(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase write config is missing" }, { status: 500 });

  try {
    const result = await runImageEngine(supabase, { dryRun });
    if (!dryRun && result.repaired.length > 0) revalidateTag("deals"); // new pictures show on the Deals pages now
    // Pictures are missing and none could be repaired: show it as a failed run so it is noticed.
    const stuck = result.missing > 0 && result.repaired.length === 0;
    const summary = { ...result, note: stuck ? "Products still have no picture and none could be repaired" : undefined };
    if (!dryRun) await logCronRun(JOB, !stuck, summary);
    return NextResponse.json({ ok: !stuck, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!dryRun) await logCronRun(JOB, false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
