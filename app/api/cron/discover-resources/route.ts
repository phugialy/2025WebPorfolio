import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { discoverResourcesForUncoveredArticles } from "@/lib/resource-discovery";
import { logCronRun } from "@/lib/cron-log";

// Logs to cron_runs (see lib/cron-log.ts) so a real production run leaves a
// trace -- previously this had no observability at all, so "did it run" and
// "did Canopy actually accept the key" were both unanswerable without
// pulling the secret locally, which this environment's sandbox silently
// redacts (see .claude/commands/seo-check.md). The `log` array already
// carries Canopy's raw HTTP status/error text per search term (safe: that's
// data about the call, never the key itself) -- persisting it here means
// the next real cron firing gives a definitive answer instead of a guess.
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await discoverResourcesForUncoveredArticles();
    await logCronRun("discover-resources", true, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logCronRun("discover-resources", false, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
