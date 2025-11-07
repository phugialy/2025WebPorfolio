import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  homepage: string | null;
}

interface GitHubError {
  message: string;
  documentation_url?: string;
}

/**
 * GitHub API route to fetch user repositories
 * Requires GITHUB_TOKEN in environment variables
 */
export async function GET(request: NextRequest) {
  const githubToken = process.env.GITHUB_TOKEN;
  const username = request.nextUrl.searchParams.get("username") || process.env.GITHUB_USERNAME;

  if (!githubToken) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN not configured. Please add it to .env.local" },
      { status: 500 }
    );
  }

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username not provided. Add GITHUB_USERNAME to .env.local or pass ?username=yourusername" },
      { status: 400 }
    );
  }

  try {
    // Fetch repositories from GitHub API
    const apiUrl = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=all`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": `token ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "portfolio-sync",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `User "${username}" not found on GitHub` },
          { status: 404 }
        );
      }
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: "GitHub authentication failed. Check your GITHUB_TOKEN." },
          { status: 401 }
        );
      }
      const error: GitHubError = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to fetch repositories" },
        { status: response.status }
      );
    }

    const repos: GitHubRepo[] = await response.json();

    // Filter and transform repos
    const publicRepos = repos
      .filter((repo) => !repo.private && !repo.fork && !repo.archived)
      .map((repo) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || "",
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || undefined,
        topics: repo.topics || [],
        createdAt: new Date(repo.created_at).getTime(),
        updatedAt: new Date(repo.updated_at).getTime(),
        pushedAt: new Date(repo.pushed_at).getTime(),
        homepage: repo.homepage || undefined,
      }));

    return NextResponse.json({
      repos: publicRepos,
      total: publicRepos.length,
      username,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

