import rssConfig from "@/rss.json";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { submitToIndexNow } from "@/lib/indexnow";
import { uploadArticleImage } from "@/lib/article-image-storage";
import { generateSlug, upsertArticleDraft } from "@/lib/articles";
import {
  buildArticleImagePrompts,
  buildPortfolioArticleDraft,
  type PortfolioLane,
} from "@/lib/article-style";
import {
  generateOpenRouterImage,
  getOpenRouterConfig,
  getOpenRouterImageConfig,
} from "@/lib/openrouter";
import {
  buildResearchRequest,
  generateArticleDraftPackage,
  generateCriticReview,
  generateImageBrief,
  generateResearchBrief,
  reviseDraftPackage,
  type ArticleDraftPackage,
  type CriticReview,
  type ImageBrief,
  type ResearchBrief,
} from "@/lib/content-agent-protocols";

type FeedItem = {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  creator?: string;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  max_items_per_run: number;
};

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  canonical_url: string | null;
  source_name: string | null;
  author: string | null;
  tags: string[] | null;
  quality_score: number | null;
  notes: string | null;
  ai_summary: string | null;
  ai_score: number | null;
  read_time: number | null;
};

type ArticleImagePromptRow = {
  role: string;
  prompt: string;
  alt: string;
};

type ArticleImageAssetRow = {
  role: string;
  url: string;
};

type SiteRow = {
  id: string;
  name: string;
  ingest_endpoint: string;
  shared_secret_name: string | null;
};

const portfolioLanes = new Set<PortfolioLane>([
  "AI Advancement",
  "Applied AI",
  "How-to-AI",
  "Vibe-coding / Codex",
  "DFW Commercial Projects + Sales",
]);

function toPortfolioLane(value: unknown): PortfolioLane {
  return typeof value === "string" && portfolioLanes.has(value as PortfolioLane)
    ? (value as PortfolioLane)
    : "Applied AI";
}

async function improveDraftWithOpenRouter(input: {
  sourceTitle: string;
  sourceName: string;
  sourceUrl: string;
  sourceSummary?: string;
  draftTitle: string;
  draftContent: string;
  draftSummary: string;
  draftTags: string[];
  lane: PortfolioLane;
}) {
  const config = getOpenRouterConfig();
  if (!config.configured) {
    return {
      content: input.draftContent,
      title: input.draftTitle,
      aiSummary: input.draftSummary,
      tags: input.draftTags,
      lane: input.lane,
      editorialScore: 5,
      imagePrompts: null,
      protocolPayload: null,
      aiModel: "local-template",
      openRouterId: null,
      usage: null,
    };
  }

  try {
    const request = buildResearchRequest({
      idea: input.sourceTitle,
      notes:
        input.sourceSummary ||
        "RSS topic intake. Build a practical, evidence-aware portfolio article from the retrieved feed item.",
      title: input.draftTitle,
      lane: input.lane,
      urls: [input.sourceUrl],
      imageDirection:
        "Create article images that attract at thumbnail size and help explain the workflow or reader takeaway.",
      contentMode: "article",
    });

    const researchBrief = await generateResearchBrief({
      request,
      sources: [
        {
          url: input.sourceUrl,
          sourceName: input.sourceName,
          title: input.sourceTitle,
          summary: input.sourceSummary || "RSS item did not provide a source summary.",
        },
      ],
    });

    let draftPackage = await generateArticleDraftPackage({
      researchBrief,
      idea: input.sourceTitle,
      notes:
        input.sourceSummary ||
        "Use the feed item as a starting point, but keep the article practical and reader-connected.",
      tags: input.draftTags,
    });

    let criticReview = await generateCriticReview({ researchBrief, draftPackage });
    const revisionPasses = [];
    let rewritesUsed = 0;

    while (criticReview.decision !== "accept" && rewritesUsed < 2) {
      rewritesUsed += 1;
      const revision = await reviseDraftPackage({
        researchBrief,
        draftPackage,
        criticReview,
        passNumber: rewritesUsed as 1 | 2,
      });
      draftPackage = revision.draftPackage;
      revisionPasses.push(revision.revisionPass);
      criticReview = await generateCriticReview({ researchBrief, draftPackage });
    }

    const imageBrief = await generateImageBrief({
      researchBrief,
      draftPackage,
      criticReview,
      imageDirection:
        "Prefer one main thumbnail and one optional inside-paper visual when the article has enough concrete workflow detail.",
    });

    const imagePrompts = imagePromptsFromBrief(imageBrief);
    const editorialScore = scoreFromCritic(criticReview, draftPackage);

    return {
      content: draftPackage.finalContent.markdown || input.draftContent,
      title: draftPackage.finalContent.title || input.draftTitle,
      aiSummary: draftPackage.finalContent.summary || input.draftSummary,
      tags: draftPackage.finalContent.tags?.length ? draftPackage.finalContent.tags : input.draftTags,
      lane: draftPackage.finalContent.portfolioLane || input.lane,
      editorialScore,
      imagePrompts: imagePrompts.length ? imagePrompts : null,
      protocolPayload: buildProtocolPayload({
        item: {
          title: input.sourceTitle,
          link: input.sourceUrl,
          description: input.sourceSummary,
        },
        researchBrief,
        draftPackage,
        criticReview,
        revisionPasses,
        imageBrief,
        rewritesUsed,
        model: config.model,
      }),
      aiModel: config.model,
      openRouterId: null,
      usage: null,
    };
  } catch (error) {
    return {
      content: input.draftContent,
      title: input.draftTitle,
      aiSummary: input.draftSummary,
      tags: input.draftTags,
      lane: input.lane,
      editorialScore: 4,
      imagePrompts: null,
      protocolPayload: {
        item: {
          title: input.sourceTitle,
          link: input.sourceUrl,
          description: input.sourceSummary,
        },
        portfolioLane: input.lane,
        editorialFramework: "agent-protocol-v2-evidence-reader-connection",
        generation: {
          provider: "local-template",
          model: "fallback-after-openrouter-error",
          error: error instanceof Error ? error.message : "Unknown OpenRouter generation error",
          protocolVersion: "agent-protocol-v2",
        },
      },
      aiModel: "fallback-after-openrouter-error",
      openRouterId: null,
      usage: null,
    };
  }
}

function scoreFromCritic(criticReview: CriticReview, draftPackage: ArticleDraftPackage) {
  const readiness = Number(criticReview.readinessLevel || draftPackage.deliveryNote.readinessLevel || 3.5);
  return Math.max(1, Math.min(10, Math.round(readiness * 2)));
}

function imagePromptsFromBrief(imageBrief: ImageBrief) {
  return imageBrief.images.slice(0, 3).map((image) => ({
    role: image.role,
    prompt: image.prompt,
    alt: image.alt,
    caption: image.caption,
  }));
}

function buildProtocolPayload(input: {
  item: Pick<FeedItem, "title" | "link" | "description">;
  researchBrief: ResearchBrief;
  draftPackage: ArticleDraftPackage;
  criticReview: CriticReview;
  revisionPasses: Array<unknown>;
  imageBrief: ImageBrief;
  rewritesUsed: number;
  model: string;
}) {
  return {
    item: input.item,
    portfolioLane: input.draftPackage.finalContent.portfolioLane,
    editorialFramework: "agent-protocol-v2-evidence-reader-connection",
    researchBrief: input.researchBrief,
    draftPackage: input.draftPackage,
    criticReview: input.criticReview,
    revisionPasses: input.revisionPasses,
    imageBrief: input.imageBrief,
    publishingGate: evaluatePublishingGate(input.researchBrief, input.criticReview),
    generation: {
      provider: "openrouter",
      model: input.model,
      rewritesUsed: input.rewritesUsed,
      rewriteLimit: 2,
      retrievalLimitation:
        "Cron harvest currently uses RSS/provided source context. For stronger trend claims, add search retrieval before auto-approval.",
      protocolVersion: "agent-protocol-v2",
    },
  };
}

function evaluatePublishingGate(researchBrief: ResearchBrief, criticReview: CriticReview) {
  const scores = criticReview.writingQualityScores;
  const unsupportedCount =
    (criticReview.unsupportedClaims?.length || 0) + (criticReview.overclaims?.length || 0);
  const evidenceReady =
    Boolean(researchBrief.evidenceDepth?.canProceed) &&
    Number(scores?.evidenceDepth || 0) >= 3 &&
    Number(researchBrief.evidenceDepth?.currentEvidenceScore || 0) >= 3;
  const readerReady = Number(scores?.readerConnection || 0) >= 4;
  const coreReady =
    Number(scores?.accuracy || 0) >= 4 &&
    Number(scores?.clarity || 0) >= 4 &&
    Number(scores?.relevance || 0) >= 4 &&
    Number(criticReview.readinessLevel || 0) >= 4;

  const pass = criticReview.decision === "accept" && coreReady && evidenceReady && readerReady && unsupportedCount === 0;

  return {
    pass,
    recommendedStatus: pass ? "auto-approval-ready" : "needs-human-review",
    minimums: {
      readinessLevel: "4+",
      accuracy: "4+",
      clarity: "4+",
      relevance: "4+",
      readerConnection: "4+",
      evidenceDepth: "3+ for articles; stronger for deep articles and papers",
      unsupportedClaims: 0,
      rewriteLimit: 2,
    },
    reasons: [
      !coreReady ? "Core quality did not meet the higher auto-approval bar." : "",
      !evidenceReady ? "Evidence depth is not strong enough for hands-off publishing." : "",
      !readerReady ? "Reader connection needs more work before automated approval." : "",
      unsupportedCount > 0 ? "Unsupported claims or overclaims remain." : "",
      criticReview.decision !== "accept" ? "Critic did not accept the article." : "",
    ].filter(Boolean),
  };
}

export function isAuthorizedCronRequest(request: Request) {
  const cronSecret =
    process.env.CRON_SECRET || process.env.BLOG_CRON_SECRET || process.env.BLOG_INGEST_API_KEY;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");
  return auth === `Bearer ${cronSecret}` || apiKey === cronSecret;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, "").trim();
}

function textFromTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const matches = xml.matchAll(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi);

  for (const match of matches) {
    const itemXml = match[1];
    const title = stripTags(textFromTag(itemXml, "title"));
    const linkTag = textFromTag(itemXml, "link");
    const linkHref = itemXml.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    const link = stripTags(linkTag || linkHref);
    const description = stripTags(
      textFromTag(itemXml, "description") || textFromTag(itemXml, "summary")
    );
    const pubDate = stripTags(
      textFromTag(itemXml, "pubDate") ||
        textFromTag(itemXml, "published") ||
        textFromTag(itemXml, "updated")
    );
    const creator = stripTags(textFromTag(itemXml, "creator") || textFromTag(itemXml, "author"));

    if (title && link) {
      items.push({ title, link, description, pubDate, creator });
    }
  }

  return items;
}

async function createRun(runType: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("article_runs")
    .insert({ run_type: runType, status: "running" })
    .select("id")
    .single();

  return data?.id || null;
}

async function finishRun(
  id: string | null,
  status: "success" | "error",
  stats: Record<string, unknown>
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase || !id) {
    return;
  }

  await supabase
    .from("article_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      ...stats,
    })
    .eq("id", id);
}

export async function harvestRssToSupabase() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const runId = await createRun("harvest-rss");
  let itemsSeen = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;

  try {
    const { data: sources, error } = await supabase
      .from("article_sources")
      .select("id, name, url, max_items_per_run")
      .eq("enabled", true);

    if (error) {
      throw error;
    }

    const fallbackSources: SourceRow[] = rssConfig.feeds.map((url) => ({
      id: "",
      name: new URL(url).hostname.replace("www.", ""),
      url,
      max_items_per_run: rssConfig.maxItemsPerRun,
    }));

    const activeSources = ((sources || []) as SourceRow[]).length
      ? ((sources || []) as SourceRow[])
      : fallbackSources;

    for (const source of activeSources) {
      const response = await fetch(source.url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const xml = await response.text();
      const items = parseFeed(xml).slice(0, source.max_items_per_run || 3);
      itemsSeen += items.length;

      for (const item of items) {
        const draft = buildPortfolioArticleDraft({
          title: item.title,
          sourceName: source.name,
          sourceUrl: item.link,
          summary: item.description,
          author: item.creator,
        });
        const slug = generateSlug(draft.title);
        const { data: existing } = await supabase
          .from("articles")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          itemsUpdated += 1;
          continue;
        }

        const generated = await improveDraftWithOpenRouter({
          sourceTitle: item.title,
          sourceName: source.name,
          sourceUrl: item.link,
          sourceSummary: item.description,
          draftTitle: draft.title,
          draftContent: draft.content,
          draftSummary: draft.aiSummary,
          draftTags: draft.tags,
          lane: draft.lane,
        });

        await upsertArticleDraft({
          title: generated.title,
          slug,
          content: generated.content,
          canonicalUrl: item.link,
          source: source.name,
          author: item.creator || "RSS",
          tags: generated.tags,
          status: "draft",
          quality: draft.qualityScore,
          aiSummary: generated.aiSummary,
          notes: draft.notes,
          portfolioLane: generated.lane,
          editorialScore: generated.editorialScore,
          editorialFramework: "agent-protocol-v2-evidence-reader-connection",
          imagePrompts: generated.imagePrompts || draft.imagePrompts,
          rawPayload:
            generated.protocolPayload ||
            {
              item,
              source,
              portfolioLane: generated.lane,
              editorialFramework: "agent-protocol-v2-evidence-reader-connection",
              imagePrompts: draft.imagePrompts,
              generation: {
                provider: generated.aiModel === "local-template" ? "local-template" : "openrouter",
                model: generated.aiModel,
                openRouterId: generated.openRouterId,
                usage: generated.usage,
              },
            },
        });

        itemsCreated += 1;
      }
    }

    await finishRun(runId, "success", {
      items_seen: itemsSeen,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
    });

    return { itemsSeen, itemsCreated, itemsUpdated };
  } catch (error) {
    await finishRun(runId, "error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function publishDueArticles() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const now = new Date().toISOString();
  const { data: approvedNow, error: approvedError } = await supabase
    .from("articles")
    .update({ status: "published", published_at: now })
    .eq("status", "approved")
    .is("publish_at", null)
    .select("id, title, slug");

  if (approvedError) {
    throw approvedError;
  }

  const { data: scheduled, error } = await supabase
    .from("articles")
    .update({ status: "published", published_at: now })
    .in("status", ["approved", "scheduled"])
    .lte("publish_at", now)
    .select("id, title, slug");

  if (error) {
    throw error;
  }

  const published = [...(approvedNow || []), ...(scheduled || [])];

  if (published.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
    await submitToIndexNow(published.map((article) => `${baseUrl}/blog/${article.slug}`));
  }

  return { published };
}

export async function syncPublishedArticles() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: articles, error: articleError } = await supabase
    .from("articles")
    .select(
      "id, title, slug, content, canonical_url, source_name, author, tags, quality_score, notes, ai_summary, ai_score, read_time"
    )
    .eq("status", "published")
    .limit(20);

  if (articleError) {
    throw articleError;
  }

  const { data: sites, error: siteError } = await supabase
    .from("sites")
    .select("id, name, ingest_endpoint, shared_secret_name")
    .eq("enabled", true);

  if (siteError) {
    throw siteError;
  }

  const results: Array<{ articleId: string; siteId: string; status: string }> = [];

  for (const article of (articles || []) as ArticleRow[]) {
    for (const site of (sites || []) as SiteRow[]) {
      const { data: existing } = await supabase
        .from("article_publications")
        .select("id, status, attempts")
        .eq("article_id", article.id)
        .eq("site_id", site.id)
        .maybeSingle();

      if (existing?.status === "published") {
        continue;
      }

      const secret = site.shared_secret_name ? process.env[site.shared_secret_name] : undefined;
      const payload = {
        title: article.title,
        slug: article.slug,
        content: article.content,
        canonicalUrl: article.canonical_url || "",
        source: article.source_name || "supabase",
        author: article.author || "Automation",
        tags: article.tags || [],
        quality: article.quality_score,
        notes: article.notes,
        aiSummary: article.ai_summary,
        aiScore: article.ai_score,
        readTime: article.read_time,
        status: "published",
      };

      const response = await fetch(site.ingest_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-api-key": secret } : {}),
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      const publication = {
        article_id: article.id,
        site_id: site.id,
        status: response.ok ? "published" : "error",
        response_status: response.status,
        response_body: responseBody.slice(0, 2000),
        last_attempt_at: new Date().toISOString(),
        published_at: response.ok ? new Date().toISOString() : null,
        attempts: Number(existing?.attempts || 0) + 1,
      };

      if (existing) {
        await supabase
          .from("article_publications")
          .update(publication)
          .eq("id", existing.id);
      } else {
        await supabase.from("article_publications").insert(publication);
      }

      results.push({
        articleId: article.id,
        siteId: site.id,
        status: publication.status,
      });
    }
  }

  return { synced: results };
}

export async function prepareMissingArticleImages() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const runId = await createRun("prepare-article-images");

  try {
    const imageConfig = getOpenRouterImageConfig();
    const { data: articles, error } = await supabase
      .from("articles")
      .select(
        "id, title, slug, canonical_url, source_name, author, ai_summary, portfolio_lane, image_prompts, image_assets"
      )
      .limit(20);

    if (error) {
      throw error;
    }

    const updated: Array<{ id: string; promptCount: number }> = [];
    const generatedImages: Array<{ id: string; role: string; model: string }> = [];
    const imageErrors: Array<{ id: string; role: string; error: string }> = [];
    let imagesGeneratedThisRun = 0;

    for (const article of articles || []) {
      const lane = toPortfolioLane(article.portfolio_lane);
      const existingPrompts = Array.isArray(article.image_prompts)
        ? (article.image_prompts as ArticleImagePromptRow[])
        : [];
      const imagePrompts = existingPrompts.length
        ? existingPrompts
        : buildArticleImagePrompts(
            {
              title: article.title,
              sourceName: article.source_name || "supabase",
              sourceUrl: article.canonical_url || "",
              summary: article.ai_summary || "",
              author: article.author || undefined,
            },
            lane,
          );

      if (!existingPrompts.length) {
        const { error: updateError } = await supabase
          .from("articles")
          .update({ image_prompts: imagePrompts })
          .eq("id", article.id);

        if (updateError) {
          throw updateError;
        }

        updated.push({ id: article.id, promptCount: imagePrompts.length });
      }

      if (!imageConfig.configured) {
        continue;
      }

      const existingAssets = Array.isArray(article.image_assets)
        ? (article.image_assets as ArticleImageAssetRow[])
        : [];
      const existingRoles = new Set(existingAssets.map((asset) => asset.role.toLowerCase()));
      const missingPrompts = imagePrompts.filter(
        (prompt) => !existingRoles.has(prompt.role.toLowerCase())
      );

      for (const prompt of missingPrompts) {
        if (imagesGeneratedThisRun >= imageConfig.maxImagesPerRun) {
          break;
        }

        try {
          const image = await generateOpenRouterImage(prompt.prompt);
          await uploadArticleImage({
            slug: article.slug,
            role: prompt.role,
            alt: prompt.alt,
            prompt: `${prompt.prompt}\n\nGenerated with ${image.model}.`,
            dataUrl: image.dataUrl,
          });
          imagesGeneratedThisRun += 1;
          generatedImages.push({ id: article.id, role: prompt.role, model: image.model });
        } catch (error) {
          imageErrors.push({
            id: article.id,
            role: prompt.role,
            error: error instanceof Error ? error.message : "Unknown image generation error",
          });
        }
      }
    }

    await finishRun(runId, "success", {
      items_seen: articles?.length || 0,
      items_updated: updated.length,
      images_created: generatedImages.length,
      error: imageErrors.length ? JSON.stringify(imageErrors).slice(0, 2000) : undefined,
    });

    return {
      updated,
      generatedImages,
      imageErrors,
      imageModel: imageConfig.configured ? imageConfig.model : "not-configured",
      maxImagesPerRun: imageConfig.maxImagesPerRun,
    };
  } catch (error) {
    await finishRun(runId, "error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
