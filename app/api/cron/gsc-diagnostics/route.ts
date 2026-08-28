import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { diagnoseGscCredentialShape, querySearchAnalytics } from "@/lib/gsc";

// One-time-use diagnostic: tries both possible Search Console property
// formats (domain property vs URL-prefix property) against real credentials
// and reports which one actually returns data, rather than requiring a
// manual check in the Search Console UI. Same cron-secret auth as every
// other cron route -- safe to leave in place as a standing health check.
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

  return NextResponse.json({ startDate, endDate, credentialShape, results });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
