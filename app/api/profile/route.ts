import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProfile, getProfile, updateDisplayName } from "@/lib/profiles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ profile: null, signedIn: false });
  }

  const profile = await getProfile(session.user.email);
  return NextResponse.json({ profile, signedIn: true });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.displayName !== "string") {
    return NextResponse.json({ error: "displayName is required." }, { status: 400 });
  }

  const result = await createProfile(session.user.email, body.displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.displayName !== "string") {
    return NextResponse.json({ error: "displayName is required." }, { status: 400 });
  }

  const result = await updateDisplayName(session.user.email, body.displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile });
}
