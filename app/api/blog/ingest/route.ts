import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { estimateReadTime, generateSlug, upsertArticleDraft } from "@/lib/articles";
import { hasSupabaseWriteConfig } from "@/lib/supabase/server";

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

    // Handle both flat and nested data structures
    const isNested = body.frontmatter && body.body;
    
    // Validate required fields based on structure
    if (isNested) {
      if (!body.frontmatter.title || !body.body || !body.frontmatter.canonical || !body.frontmatter.source?.name) {
        return NextResponse.json(
          { error: "Missing required fields in nested structure: frontmatter.title, body, frontmatter.canonical, frontmatter.source.name" },
          { status: 400 }
        );
      }
    } else {
      if (!body.title || !body.content || !body.canonicalUrl || !body.source) {
        return NextResponse.json(
          { error: "Missing required fields: title, content, canonicalUrl, source" },
          { status: 400 }
        );
      }
    }
    
    const title = isNested ? body.frontmatter.title : body.title;
    const content = isNested ? body.body : body.content;
    const canonicalUrl = isNested ? body.frontmatter.canonical : body.canonicalUrl;
    const source = isNested ? body.frontmatter.source?.name : body.source;
    const author = body.author || "n8n Bot";
    const tags = isNested ? body.frontmatter.tags : (body.tags || []);
    const quality = isNested ? body.frontmatter.quality : body.quality;
    const notes = isNested ? body.frontmatter.notes : (body.notes || undefined);

    // Generate slug from title if not provided
    const slug = body.slug || generateSlug(title);

    if (hasSupabaseWriteConfig()) {
      const article = await upsertArticleDraft({
        title,
        slug,
        content,
        canonicalUrl,
        source,
        author,
        tags,
        quality,
        notes,
        aiSummary: body.aiSummary,
        aiScore: body.aiScore,
        status: body.status || "draft",
        publishAt: body.publishAt,
        portfolioLane: body.portfolioLane,
        editorialScore: body.editorialScore,
        editorialFramework: body.editorialFramework,
        heroImageUrl: body.heroImageUrl,
        imagePrompts: body.imagePrompts,
        imageAssets: body.imageAssets,
        rawPayload: body,
      });

      return NextResponse.json({
        success: true,
        message: "Article saved to Supabase",
        data: article,
      });
    }

    // Prepare data for Convex
    const draftData = {
      title,
      slug,
      content,
      canonicalUrl,
      source,
      author,
      tags,
      quality,
      notes,
      metadata: {
        readTime: estimateReadTime(content),
        aiSummary: body.aiSummary,
        aiScore: body.aiScore,
      },
    };

    // Save to Convex
    const result = await convex.mutation(api.blog.createDraft, draftData);

    return NextResponse.json({
      success: true,
      message: result.status === "created" ? "Draft created in Convex" : "Draft updated in Convex",
      data: {
        id: result.id,
        slug,
        status: result.status,
      },
    });

  } catch (error: unknown) {
    console.error("Blog ingest error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
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

