import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  articleImageSystemPrompt,
  articleSystemPrompt,
  buildArticleImagePrompts,
  type PortfolioLane,
} from "@/lib/article-style";
import { generateOpenRouterImage, generateOpenRouterText } from "@/lib/openrouter";
import { uploadArticleImage } from "@/lib/article-image-storage";

const lanes = new Set<PortfolioLane>([
  "AI Advancement",
  "Applied AI",
  "How-to-AI",
  "Vibe-coding / Codex",
  "DFW Commercial Projects + Sales",
]);

function toLane(value: unknown): PortfolioLane {
  return typeof value === "string" && lanes.has(value as PortfolioLane)
    ? (value as PortfolioLane)
    : "Applied AI";
}

function criticPrompt(article: {
  title: string;
  content: string;
  source_name?: string | null;
  canonical_url?: string | null;
  raw_payload?: unknown;
}) {
  return `Review this portfolio article as the Critic Agent for Phu Gia Ly.

Use critic lenses:
- Clarity
- Structure
- Audience fit
- Accuracy and research faithfulness
- Engagement
- Style
- Helpful-first usefulness
- Evidence depth
- Reader connection
- Information gain
- Overclaiming
- Readability under density

Return concise Markdown:
## Critic Review
Readiness level: X / 5

### Pass
- ...

### Needs revision
- ...

### Top fixes
1. ...
2. ...
3. ...

### Unsupported or risky claims
- ...

### Evidence and reader connection
- Evidence depth:
- Reader connection:

### Decision
Accept, revise, or reject.

Article title: ${article.title}
Source: ${article.source_name || "unknown"}
Source URL: ${article.canonical_url || "none"}
Research/agent packages if available:
${JSON.stringify(article.raw_payload || {}, null, 2).slice(0, 6000)}

Article:
${article.content}`;
}

function writerPrompt(article: {
  title: string;
  content: string;
  source_name?: string | null;
  canonical_url?: string | null;
}, instruction: string) {
  return `Revise this article using the user's instruction.

Return only the full revised Markdown article.

Use the Writer Agent protocol:
- Interpret the audience.
- Preserve accuracy.
- Pick a clear angle.
- Improve plain language, flow, and style.
- Keep Phu's practical human touch: grounded judgment, what I would test, what I would avoid, honest caveats.
- Do not invent unsupported facts.
- Do not over-polish into generic marketing content.

User instruction:
${instruction || "Improve clarity, tone, structure, and practical value."}

Current title: ${article.title}
Source: ${article.source_name || "unknown"}
Source URL: ${article.canonical_url || "none"}

Current article:
${article.content}`;
}

function researchPrompt(article: {
  title: string;
  content: string;
  source_name?: string | null;
  canonical_url?: string | null;
}, instruction: string) {
  return `Act as the Research Agent for this article instance. Do not write the article.

Return concise Markdown using this format:
## Research Interpretation

## Source List

## Source Scores

## Key Claims

## Theme Clusters

## Evidence Strength

## Missing Evidence

## Writer Handoff

Rules:
- Separate internal, retrieved, and inferred knowledge.
- If current/trending facts are needed and sources are missing, say retrieval is incomplete.
- Never invent source titles, statistics, quotes, or paper findings.
- Label inference.

User instruction:
${instruction || "Find useful improvements and source angles."}

Article title: ${article.title}
Current source: ${article.source_name || "unknown"} ${article.canonical_url || ""}

Current article:
${article.content}`;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseEditorJson(value: string) {
  const fallback = {
    mode: "answer",
    assistantMessage: value,
    critique: [],
    patchNotes: [],
    applyTargets: [],
  };

  try {
    const fenced = value.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const raw = fenced || value.match(/\{[\s\S]*\}/)?.[0] || value;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function editorPrompt(
  article: {
    title: string;
    content: string;
    ai_summary?: string | null;
    notes?: string | null;
    source_name?: string | null;
    canonical_url?: string | null;
    portfolio_lane?: string | null;
    raw_payload?: unknown;
  },
  input: {
    instruction: string;
    audienceLevel: string;
    currentTitle: string;
    currentSummary: string;
    currentContent: string;
    currentNotes: string;
  }
) {
  return `You are the Article Editor Agent inside Phu Gia Ly's admin workspace.

Your job is to help improve the current article. You can answer questions, critique the current draft, or propose direct edits.

Important behavior:
- Be article-aware. Use the current live draft below, not only the saved database version.
- Comprehend what the article is really about before editing.
- Classify article type before choosing structure.
- Identify the intended reader effect: realization, warning, decision pressure, practical confidence, technical clarity, or strategic urgency.
- If the user asks a question, answer clearly and include practical next edit suggestions.
- If the user asks for a rewrite, return proposed fields that can be applied directly.
- If the user asks for critique, diagnose the article and do not rewrite everything unless needed.
- Preserve factual accuracy and do not invent sources, statistics, quotes, or claims.
- Respect the requested audience level over the generic portfolio template.
- If the audience is CFO/executive, remove engineer-only sections that do not fit, such as "Try this next" or "What I would avoid", unless the user specifically asks to keep them.
- CFO/executive writing should emphasize decision framing, operational impact, risk, cost of inaction, governance, trust, investment priority, and business outcomes.
- Engineering writing can include implementation details, review gates, and practical workflow steps.
- Do not force the same structure onto every article.
- Research only when external facts are needed. Tone, structure, hook, transitions, and role-based reframing do not require research.
- Hooks should create realization through tension, risk, cost, missed assumption, or decision pressure.
- Use structure freedom: remove, merge, rename, or reorder sections when the current shape is wrong.
- Critical-thinking pieces should create the "oh, I have not thought about it that way" moment.

Return only JSON:
{
  "mode": "answer | critique | rewrite | patch",
  "assistantMessage": "short useful response to the admin",
  "critique": ["specific issue or opportunity"],
  "articleType": "executive insight | critical thinking piece | business warning | technical explainer | practical guide | opinion/editorial | workflow tutorial | strategic memo",
  "readerEffect": "string",
  "removedSections": ["string"],
  "proposedTitle": "optional replacement title",
  "proposedSummary": "optional replacement summary",
  "proposedMarkdown": "optional full replacement Markdown article",
  "proposedNotes": "optional internal publishing/editorial notes",
  "patchNotes": ["what changed or should change"],
  "audienceFit": "CFO / executive / technical leadership / engineer / operator / mixed",
  "applyTargets": ["title", "summary", "content", "notes"]
}

Requested audience level:
${input.audienceLevel || "Use the user's instruction and article context."}

User instruction:
${input.instruction || "Critique this article and suggest the highest-value improvements."}

Saved article metadata:
Title: ${article.title}
Source: ${article.source_name || "unknown"}
Source URL: ${article.canonical_url || "none"}
Lane: ${article.portfolio_lane || "unknown"}
Saved summary: ${article.ai_summary || "none"}
Saved notes: ${article.notes || "none"}

Research/agent packages if available:
${JSON.stringify(article.raw_payload || {}, null, 2).slice(0, 8000)}

Current live draft from the workspace:
Title:
${input.currentTitle || article.title}

Summary:
${input.currentSummary || article.ai_summary || ""}

Notes:
${input.currentNotes || article.notes || ""}

Markdown:
${input.currentContent || article.content}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action as "writer" | "critic" | "research" | "image" | "editor";
  const instruction = typeof body.instruction === "string" ? body.instruction : "";
  const audienceLevel = cleanText(body.audienceLevel);
  const currentDraft = {
    currentTitle: cleanText(body.currentDraft?.title),
    currentSummary: cleanText(body.currentDraft?.aiSummary),
    currentContent: cleanText(body.currentDraft?.content),
    currentNotes: cleanText(body.currentDraft?.notes),
  };

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin config is missing" }, { status: 500 });
  }

  const { data: article, error } = await supabase
    .from("articles")
    .select(
      "id, title, slug, content, source_name, canonical_url, author, ai_summary, notes, portfolio_lane, image_prompts, raw_payload"
    )
    .eq("id", id)
    .single();

  if (error || !article) {
    return NextResponse.json({ error: error?.message || "Article not found" }, { status: 404 });
  }

  try {
    if (action === "editor") {
      const result = await generateOpenRouterText([
        { role: "system", content: articleSystemPrompt },
        {
          role: "user",
          content: editorPrompt(article, {
            instruction,
            audienceLevel,
            ...currentDraft,
          }),
        },
      ]);
      const parsed = parseEditorJson(result.content);

      return NextResponse.json({
        action,
        output: result.content,
        editor: parsed,
        model: result.model,
        usage: result.usage,
      });
    }

    if (action === "critic") {
      const result = await generateOpenRouterText([
        { role: "system", content: articleSystemPrompt },
        { role: "user", content: criticPrompt(article) },
      ]);

      return NextResponse.json({
        action,
        output: result.content,
        model: result.model,
        usage: result.usage,
      });
    }

    if (action === "research") {
      const result = await generateOpenRouterText([
        { role: "system", content: articleSystemPrompt },
        { role: "user", content: researchPrompt(article, instruction) },
      ]);

      return NextResponse.json({
        action,
        output: result.content,
        model: result.model,
        usage: result.usage,
      });
    }

    if (action === "writer") {
      const result = await generateOpenRouterText([
        { role: "system", content: articleSystemPrompt },
        { role: "user", content: writerPrompt(article, instruction) },
      ]);

      return NextResponse.json({
        action,
        output: result.content,
        model: result.model,
        usage: result.usage,
      });
    }

    if (action === "image") {
      const lane = toLane(article.portfolio_lane);
      const prompts = Array.isArray(article.image_prompts) && article.image_prompts.length
        ? article.image_prompts
        : buildArticleImagePrompts(
            {
              title: article.title,
              sourceName: article.source_name || "admin workspace",
              sourceUrl: article.canonical_url || "",
              summary: article.ai_summary || article.content.slice(0, 300),
              author: article.author || undefined,
            },
            lane,
            1
          );

      const prompt = prompts[0];
      const result = await generateOpenRouterImage(
        `${articleImageSystemPrompt}\n\nUser instruction: ${instruction || "Generate the main thumbnail."}\n\n${prompt.prompt}`
      );
      const upload = await uploadArticleImage({
        slug: article.slug,
        role: prompt.role,
        alt: prompt.alt,
        prompt: `${prompt.prompt}\n\nWorkspace instruction: ${instruction}\nGenerated with ${result.model}.`,
        dataUrl: result.dataUrl,
      });

      return NextResponse.json({
        action,
        output: upload.asset,
        model: result.model,
        usage: result.usage,
      });
    }

    return NextResponse.json({ error: "Unknown AI action" }, { status: 400 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "AI action failed" },
      { status: 500 }
    );
  }
}
