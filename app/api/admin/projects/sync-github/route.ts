import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { bulkSyncGitHubRepos, type GitHubRepoInput } from "@/lib/projects";

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  const repos = body.repos as GitHubRepoInput[] | undefined;
  const username = body.username as string | undefined;

  if (!repos || !username) {
    return NextResponse.json({ error: "Missing required fields: repos, username" }, { status: 400 });
  }

  try {
    const result = await bulkSyncGitHubRepos(repos, username);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
