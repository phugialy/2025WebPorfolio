import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * API endpoint for n8n to send blog content
 * 
 * POST /api/blog/ingest
 * 
 * Body:
 * {
 *   title: string,
 *   content: string,
 *   canonicalUrl: string,
 *   source: string,
 *   author?: string,
 *   tags?: string[],
 *   quality?: number,
 *   notes?: string,
 *   apiKey: string (for security)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Security: Check API key
    const apiKey = body.apiKey || request.headers.get("x-api-key");
    if (apiKey !== process.env.BLOG_INGEST_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!body.title || !body.content || !body.canonicalUrl || !body.source) {
      return NextResponse.json(
        { error: "Missing required fields: title, content, canonicalUrl, source" },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const slug = body.slug || generateSlug(body.title);

    // Prepare data for Convex
    const draftData = {
      title: body.title,
      slug,
      content: body.content,
      canonicalUrl: body.canonicalUrl,
      source: body.source,
      author: body.author,
      tags: body.tags || [],
      quality: body.quality,
      notes: body.notes,
      metadata: {
        readTime: estimateReadTime(body.content),
        aiSummary: body.aiSummary,
        aiScore: body.aiScore,
      },
    };

    // Save to Convex
    const result = await convex.mutation(api.blog.createDraft, draftData);

    return NextResponse.json({
      success: true,
      message: result.status === "created" ? "Draft created" : "Draft updated",
      data: {
        id: result.id,
        slug,
        status: result.status,
      },
    });

  } catch (error: any) {
    console.error("Blog ingest error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Estimate reading time in minutes
 */
function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * GET endpoint to check API status
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/blog/ingest",
    method: "POST",
    requiredFields: ["title", "content", "canonicalUrl", "source", "apiKey"],
    optionalFields: ["author", "tags", "quality", "notes", "slug"],
  });
}

