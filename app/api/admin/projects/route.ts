import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createProject, listAllProjects } from "@/lib/projects";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const projects = await listAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  if (!body.title) {
    return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
  }

  const slug =
    body.slug ||
    `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const project = await createProject({ ...body, slug });
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
