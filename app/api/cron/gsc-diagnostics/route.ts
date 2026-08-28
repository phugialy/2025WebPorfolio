import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { diagnoseGscCredentialShape, querySearchAnalytics } from "@/lib/gsc";
import { logCronRun } from "@/lib/cron-log";

// Daily GSC connectivity health check: tries all three possible Search
// Console property formats (domain property vs URL-prefix, www/non-www)
// against the configured service-account credentials and records which one
// actually returns data. Runs as a real Vercel Cron (see vercel.json), so
// it's authorized the same way as every other cron route -- Vercel injects
// Authorization: Bearer $CRON_SECRET automatically on scheduled invocations,
// nothing here needed to change to support that. The outcome is logged to
// cron_runs so it can be verified via a normal service-role query instead of
// requiring the cron secret to check on it.
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const candidates = [
    "sc-domain:phugialy.com",
    "https://www.phugialy.com/",
    "https://phugialy.com/",
  ];

  const credentialShape = diagnoseGscCredentialShape();
  const results: Record<string, unknown> = {};

  for (const siteUrl of candidates) {
    try {
      const rows = await querySearchAnalytics({
        siteUrl,
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 10,
      });
      results[siteUrl] = { ok: true, rowCount: rows.length, sample: rows.slice(0, 5) };
    } catch (error) {
      results[siteUrl] = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const ok = Object.values(results).some(
    (result) => typeof result === "object" && result !== null && (result as { ok?: boolean }).ok === true
  );

  await logCronRun("gsc-diagnostics", ok, { startDate, endDate, credentialShape, results });

  return NextResponse.json({ startDate, endDate, credentialShape, results });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
