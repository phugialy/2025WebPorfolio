import { NextRequest, NextResponse } from "next/server";
import { createCronAuthGate } from "@/app/social-agent-adapters/auth-gate";
import { createSupabaseStore } from "@/app/social-agent-adapters/store";
import { runSocialWatchdog, type WatchdogEmail } from "@/social-agent/reliability/watchdog";
import { sendResendEmail, getEmailConfigStatus } from "@/lib/email";
import { logCronRun } from "@/lib/cron-log";

// Phase 7 (Reliability) -- thin host-glue wiring only. All decision logic
// (staleness, credential-vs-"nothing to post" classification, cost cap)
// lives in social-agent/reliability/watchdog.ts, which this route must not
// duplicate -- see that file for the reasoning behind every threshold
// below.
//
// The doc's pipeline cadence target is every 1-2h (see "Silent trigger
// death" in docs/research/social-media-manager-agent.md's Operational
// reliability section); this watchdog itself runs once daily, same cadence
// as site-health (app/api/cron/site-health/route.ts).
//
// TICK_WINDOW_HOURS tolerates one missed tick without false-alarming on
// ordinary jitter (a single slow/skipped 1-2h tick), while still catching
// real silent death (GitHub Actions disabled, every tick erroring) well
// within this watchdog's own daily run -- 4h is roughly 2x the slower end
// of the doc's cadence range, not a number pulled from the doc itself.
const TICK_WINDOW_HOURS = 4;

// This watchdog runs once daily -- 24h of lookback covers a full day of
// expected pipeline activity, so "zero social_runs rows at all in 24h"
// reliably means the GitHub Actions trigger itself isn't firing, rather
// than just unlucky check timing relative to the tick cadence.
const ACTIVITY_LOOKBACK_HOURS = 24;

async function sendWatchdogAlert(input: WatchdogEmail): Promise<void> {
  const { notificationEmail } = getEmailConfigStatus();
  if (!notificationEmail) {
    throw new Error("No notification email configured (SCHEDULE_NOTIFICATION_EMAIL / SCHEDULE_OWNER_EMAIL / ADMIN_EMAIL)");
  }

  await sendResendEmail({
    to: notificationEmail,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function POST(request: NextRequest) {
  const authGate = createCronAuthGate();
  if (!authGate.isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = createSupabaseStore();
    const result = await runSocialWatchdog({
      store,
      sendEmail: sendWatchdogAlert,
      config: {
        tickWindowHours: TICK_WINDOW_HOURS,
        activityLookbackHours: ACTIVITY_LOOKBACK_HOURS,
      },
    });

    // Logged the same way every other cron in this repo logs (see
    // lib/cron-log.ts) -- `ok` here reflects whether the watchdog *check
    // itself* completed, not whether the system it's checking is healthy;
    // an unhealthy-but-successfully-detected-and-alerted run is still
    // `ok: true` for cron-log purposes, same as flag-underperforming
    // logging `ok: true` for a run that found nothing to flag.
    await logCronRun("social-watchdog", true, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logCronRun("social-watchdog", false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
