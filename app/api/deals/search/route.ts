import { NextRequest, NextResponse } from "next/server";
import { cleanSearchTerm, isSearchTier, logDealsSearch } from "@/lib/deals-search-log";

export const dynamic = "force-dynamic";

// Receives "a shopper searched Deals for this, and this is how it went" from the
// catalog search box. Public by necessity, so it stays narrow: a short cleaned
// term, one of three outcomes, a small count. Anything else is dropped, and a
// failure never reaches the shopper.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; reset: number }>();

// A per-instance limit, which is enough to stop one visitor flooding the table by
// accident; it is not a security boundary.
function allowed(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new NextResponse(null, { status: 400 });
    body = parsed as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const term = cleanSearchTerm(body.term);
  const count = body.resultCount;
  if (!term || !isSearchTier(body.tier) || typeof count !== "number" || !Number.isFinite(count)) {
    return new NextResponse(null, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return new NextResponse(null, { status: 204 });

  try {
    await logDealsSearch({ term, tier: body.tier, resultCount: count, userAgent: request.headers.get("user-agent") });
  } catch (error) {
    console.error("Deals search log failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
