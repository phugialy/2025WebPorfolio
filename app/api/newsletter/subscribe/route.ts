import { NextRequest, NextResponse } from "next/server";
import { newsletter } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

// Public endpoint, so it stays narrow: JSON in, a neutral answer out. The
// reply is identical for a new address, a pending one and an already
// subscribed one, so the form cannot be used to find out who is on the list.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Honeypot: real visitors never fill the hidden "website" field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await newsletter.subscribe({
      email: body.email,
      source: body.source,
      slug: body.slug,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
    });

    if (result === "invalid_email") {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    if (result === "send_failed") {
      return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
