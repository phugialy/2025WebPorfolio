import { NextRequest, NextResponse } from "next/server";
import { requestRepoAccess } from "@/lib/projects";

// Public endpoint -- a signed-out visitor requesting access to a private
// repo is exactly the use case this exists for, no session required.
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.projectId || !body.email || !body.name) {
    return NextResponse.json(
      { error: "Missing required fields: projectId, email, name" },
      { status: 400 }
    );
  }

  try {
    await requestRepoAccess({
      projectId: body.projectId,
      email: body.email,
      name: body.name,
      company: body.company,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
