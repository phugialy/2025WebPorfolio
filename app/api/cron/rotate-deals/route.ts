import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { getDealsData } from "@/lib/deals";
import { HOLIDAYS } from "@/lib/deals-core";
import type { PlanSnapshot } from "@/lib/discovery-plan";
import { reevalEpoch, dayInEpoch } from "@/lib/rotation-core";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logCronRun } from "@/lib/cron-log";

// The daily rotation boundary (lib/deals-rotation.ts, 05:00 UTC). Runs once a
// day: clears the cached Deals data and pages so the new lineup is built now
// rather than on a visitor's request, then records what is showing so a day's
// change can be seen (and so the guide engine and social posts can ask what is
// featured today).
const JOB = "rotate-deals";
const HOLIDAY_SHOWN = 5;

function lineupIds(data: Awaited<ReturnType<typeof getDealsData>>): string[] {
  const ids = new Set<string>();
  for (const p of data.top) ids.add(p.id);
  for (const h of HOLIDAYS) for (const p of (data.holidays[h.slug] ?? []).slice(0, HOLIDAY_SHOWN)) ids.add(p.id);
  return [...ids];
}

async function handler(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("deals");
    revalidatePath("/deals");
    revalidatePath("/deals/[holiday]", "page");

    const data = await getDealsData();
    const ids = lineupIds(data);
    const names = new Map<string, string>();
    for (const p of data.top) names.set(p.id, p.name);
    for (const h of HOLIDAYS) for (const p of data.holidays[h.slug] ?? []) names.set(p.id, p.name);

    // What changed since the last run, from the log the previous run wrote.
    let changed: number | null = null;
    let previousSnapshot: PlanSnapshot | null = null;
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data: last } = await supabase
        .from("cron_runs")
        .select("summary")
        .eq("job", JOB)
        .eq("ok", true)
        .order("created_at", { ascending: false })
        .limit(1);
      const previous = last?.[0]?.summary as { ids?: string[]; planSnapshot?: PlanSnapshot } | undefined;
      previousSnapshot = previous?.planSnapshot ?? null;
      const before = previous?.ids;
      if (Array.isArray(before)) {
        const was = new Set(before);
        changed = ids.filter((id) => !was.has(id)).length;
      }
    }

    // The strategy is re-evaluated every 48 hours: on the first day of a
    // period (or when there is no snapshot for this period yet) it is rebuilt
    // from live click data; on the second day the same snapshot is carried
    // forward, so the discovery engine's order for the period does not shift
    // under it. The display above still re-reads live data every day.
    const now = Date.now();
    const epoch = reevalEpoch(now);
    const reevaluate = dayInEpoch(now) === 0 || !previousSnapshot || previousSnapshot.epoch !== epoch;
    const planSnapshot: PlanSnapshot = reevaluate
      ? { epoch, computedAt: new Date(now).toISOString(), factors: data.categoryFactors }
      : (previousSnapshot as PlanSnapshot);

    const summary = {
      reevaluated: reevaluate,
      planSnapshot,
      bucket: data.rotation.bucket,
      startedAt: data.rotation.startedAt,
      rotationEnabled: data.rotation.enabled,
      productsShown: ids.length,
      newSinceLastRun: changed,
      top: data.top.map((p) => p.name),
      holidays: Object.fromEntries(
        HOLIDAYS.map((h) => [h.slug, (data.holidays[h.slug] ?? []).slice(0, HOLIDAY_SHOWN).map((p) => p.name)])
      ),
      ids,
    };
    await logCronRun(JOB, true, summary);
    return NextResponse.json({ ok: true, ...summary, ids: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logCronRun(JOB, false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
