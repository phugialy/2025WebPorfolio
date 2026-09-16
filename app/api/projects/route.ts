import { NextResponse } from "next/server";
import { listVisibleProjects } from "@/lib/projects";

// Public endpoint for /work -- returns visible projects only (featured is a
// subset of these, derived client-side rather than a second round-trip).
export async function GET() {
  const projects = await listVisibleProjects();
  return NextResponse.json({ projects });
}
