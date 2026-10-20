import { NextRequest, NextResponse } from "next/server";
import { newsletter } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

// Target of the List-Unsubscribe one-click header (RFC 8058): mail apps POST
// here with the token in the query string. Always answers 200 for a valid
// token, and is safe to repeat.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  try {
    const result = await newsletter.unsubscribe(token);
    return new NextResponse(null, { status: result === "unsubscribed" ? 200 : 400 });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
