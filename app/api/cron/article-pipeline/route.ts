import { NextRequest, NextResponse } from "next/server";
import {
  harvestRssToSupabase,
  isAuthorizedCronRequest,
  prepareMissingArticleImages,
  publishDueArticles,
  syncPublishedArticles,
} from "@/lib/article-automation";
import { getOpenRouterConfig } from "@/lib/openrouter";

async function handler(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const openRouter = getOpenRouterConfig();

  results.openRouter = {
    configured: openRouter.configured,
    model: openRouter.model,
    maxTokens: openRouter.maxTokens,
    temperature: openRouter.temperature,
  };

  results.harvest = await harvestRssToSupabase();
  results.prepareImages = await prepareMissingArticleImages();
  results.publishDue = await publishDueArticles();
  results.syncSites = await syncPublishedArticles();

  return NextResponse.json({ ok: true, ...results });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
