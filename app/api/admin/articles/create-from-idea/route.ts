import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { uploadArticleImage } from "@/lib/article-image-storage";
import { type PortfolioLane } from "@/lib/article-style";
import { generateSlug, upsertArticleDraft } from "@/lib/articles";
import {
  buildResearchRequest,
  generateArticleDraftPackage,
  generateCriticReview,
  generateImageBrief,
  generateResearchBrief,
  reviseDraftPackage,
  type ContentMode,
  type SourceSummary,
} from "@/lib/content-agent-protocols";
import { generateOpenRouterImage } from "@/lib/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type IntakeImage = {
  name?: string;
  url?: string;
  dataUrl?: string;
};

const lanes = new Set<PortfolioLane>([
  "AI Advancement",
  "Applied AI",
  "How-to-AI",
  "Vibe-coding / Codex",
  "DFW Commercial Projects + Sales",
]);

const contentModes = new Set<ContentMode>(["article", "deep_article", "paper"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function toLane(value: unknown): PortfolioLane {
  return typeof value === "string" && lanes.has(value as PortfolioLane)
    ? (value as PortfolioLane)
    : "Applied AI";
}

function toContentMode(value: unknown): ContentMode {
  return typeof value === "string" && contentModes.has(value as ContentMode)
    ? (value as ContentMode)
    : "article";
}

function tagsForLane(lane: PortfolioLane) {
  switch (lane) {
    case "AI Advancement":
      return ["ai-advancement", "software-teams", "engineering-judgment"];
    case "Applied AI":
      return ["applied-ai", "automation", "workflow"];
    case "How-to-AI":
      return ["how-to-ai", "implementation", "workflow"];
    case "Vibe-coding / Codex":
      return ["vibe-coding", "codex", "developer-workflow"];
    case "DFW Commercial Projects + Sales":
      return ["dfw", "commercial-projects", "automation"];
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, name: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return html.match(pattern)?.[1] || "";
}

async function summarizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const response = await fetch(parsed.toString(), {
      cache: "no-store",
      headers: {
        "user-agent": "PhuGiaLyPortfolioArticleIntake/1.0",
      },
    });

    if (!response.ok) {
      return {
        url,
        sourceName: parsed.hostname.replace("www.", ""),
        title: parsed.hostname.replace("www.", ""),
        summary: `Source returned HTTP ${response.status}.`,
      };
    }

    const html = await response.text();
    const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description =
      metaContent(html, "description") || metaContent(html, "og:description");
    const body = stripHtml(description || html).slice(0, 1100);

    return {
      url,
      sourceName: parsed.hostname.replace("www.", ""),
      title: title || parsed.hostname.replace("www.", ""),
      summary: body,
    };
  } catch {
    return {
      url,
      sourceName: "provided source",
      title: url,
      summary: "The source URL could not be fetched, but it was kept as a reference.",
    };
  }
}

async function uniqueSlug(title: string) {
  const supabase = createSupabaseAdminClient();
  const base = generateSlug(title);
  if (!supabase) return base;

  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    candidate = `${base.slice(0, 62)}-${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  const idea = cleanText(body.idea);
  const notes = cleanText(body.notes);
  const imageDirection = cleanText(body.imageDirection);
  const requestedLane = toLane(body.lane);
  const contentMode = toContentMode(body.contentMode);
  const urls = Array.isArray(body.urls)
    ? (body.urls as unknown[]).map(cleanText).filter(Boolean).slice(0, 5)
    : [];
  const images: IntakeImage[] = Array.isArray(body.images) ? body.images.slice(0, 3) : [];

  if (!idea && urls.length === 0) {
    return NextResponse.json(
      { error: "Provide an article idea, at least one URL, or both." },
      { status: 400 }
    );
  }

  const sourceSummaries = await Promise.all(urls.map((url) => summarizeUrl(url)));
  const sourceContext = sourceSummaries
    .map(
      (source, index) =>
        `${index + 1}. ${source.title}\nSource: ${source.sourceName}\nURL: ${source.url}\nSummary: ${source.summary}`
    )
    .join("\n\n");
  const imageContext = images
    .map((image, index) => `${index + 1}. ${image.name || image.url || "uploaded image"}`)
    .join("\n");
  const fullImageContext = [imageContext, imageDirection ? `Image direction: ${imageDirection}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const provisionalTitle =
    idea.slice(0, 88) ||
    sourceSummaries[0]?.title ||
    "Practical AI and Automation Workflow";
  const researchRequest = buildResearchRequest({
    idea,
    notes: [notes, sourceContext, fullImageContext].filter(Boolean).join("\n\n"),
    title: provisionalTitle,
    lane: requestedLane,
    imageDirection,
    urls,
    contentMode,
  });
  const researchBrief = await generateResearchBrief({
    request: researchRequest,
    sources: sourceSummaries as SourceSummary[],
  });
  const tags = tagsForLane(researchBrief.writerHandoff.portfolioLane);
  let draftPackage = await generateArticleDraftPackage({
    researchBrief,
    idea,
    notes: [notes, sourceContext, fullImageContext].filter(Boolean).join("\n\n"),
    tags,
  });
  let criticReview = await generateCriticReview({ researchBrief, draftPackage });
  const revisionPasses = [];

  for (const passNumber of [1, 2] as const) {
    if (criticReview.decision !== "revise") break;

    const revision = await reviseDraftPackage({
      researchBrief,
      draftPackage,
      criticReview,
      passNumber,
    });
    draftPackage = revision.draftPackage;
    revisionPasses.push(revision.revisionPass);
    criticReview = await generateCriticReview({ researchBrief, draftPackage });
  }

  const imageBrief = await generateImageBrief({
    researchBrief,
    draftPackage,
    criticReview,
    imageDirection,
  });
  const title = cleanText(draftPackage.finalContent.title) || researchBrief.writerHandoff.recommendedTitle;
  const lane = draftPackage.finalContent.portfolioLane || researchBrief.writerHandoff.portfolioLane;
  const slug = await uniqueSlug(title);
  const imagePrompts = imageBrief.images.map((image) => ({
    role: image.role,
    prompt: image.prompt,
    alt: image.alt,
  }));
  const finalNotes = [
    "Generated from admin idea intake using the agent protocol pipeline.",
    notes,
    criticReview.decision !== "accept"
      ? `Critic decision: ${criticReview.decision}. Automatic rewrites used: ${revisionPasses.length}. Human review required.`
      : `Critic decision: ${criticReview.decision}.`,
    criticReview.topFixes.length ? `Top critic fixes/notes: ${criticReview.topFixes.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  await upsertArticleDraft({
    title,
    slug,
    content: draftPackage.finalContent.markdown,
    canonicalUrl: sourceSummaries[0]?.url || "",
    source: sourceSummaries[0]?.sourceName || "admin idea intake",
    author: admin.session.user?.name || "Phu Gia Ly",
    tags: draftPackage.finalContent.tags?.length ? draftPackage.finalContent.tags : tags,
    status: "draft",
    quality: 6,
    aiSummary: draftPackage.finalContent.summary || "Generated from a new admin idea intake.",
    notes: finalNotes,
    portfolioLane: lane,
    editorialScore: Math.round(criticReview.readinessLevel * 2),
    editorialFramework: "agent-protocol-v1-practical-ai-automation-notes",
    imagePrompts,
    rawPayload: {
      idea,
      notes,
      imageDirection,
      urls,
      images: images.map((image) => ({
        name: image.name,
        url: image.url,
        hasDataUrl: Boolean(image.dataUrl),
      })),
      sourceSummaries,
      researchRequest,
      researchBrief,
      articleDraftPackage: draftPackage,
      criticReview,
      revisionPasses,
      imageBrief,
      generation: {
        rewriteLimit: 2,
        rewritesUsed: revisionPasses.length,
        retrievalLimitation:
          urls.length === 0
            ? "No user-provided URLs were available; current/trending claims must be treated as incomplete."
            : undefined,
      },
    },
  });

  let imageError = "";

  try {
    const prompt = imagePrompts[0];
    const image = await generateOpenRouterImage(
      prompt.prompt
    );
    await uploadArticleImage({
      slug,
      role: prompt.role,
      alt: prompt.alt,
      prompt: `${prompt.prompt}\n\nGenerated with ${image.model}.`,
      dataUrl: image.dataUrl,
    });
  } catch (error) {
    imageError = error instanceof Error ? error.message : "Image generation failed";
  }

  return NextResponse.json({
    article: {
      title,
      slug,
      status: "draft",
      lane,
      criticDecision: criticReview.decision,
      rewritesUsed: revisionPasses.length,
      imageError: imageError || null,
    },
    workspaceUrl: `/admin/workspace/${slug}`,
  });
}
