import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Starting weights, not scientifically tuned -- revisit once there's a few
// weeks of real rank_score/click data to look at. Recency decays linearly to
// 0 over ~3 weeks so new content is naturally prioritized without a hard
// cliff; engagement is log-scaled so one high-traffic article doesn't
// permanently dominate; curation boosts reward content the owner has
// actively vouched for (a lens, a take, an active Field Note thread).
const RECENCY_DECAY_DAYS = 21;
const RECENCY_WEIGHT = 5;
const VIEWS_WEIGHT = 2;
const CLICKS_WEIGHT = 3;
const LENS_BOOST = 2;
const TAKE_BOOST = 1;
const FIELD_NOTE_BOOST = 1.5;

export function computeRankScore(article: {
  publishedAt: string | null;
  createdAt: string;
  views: number | null;
  clickCount: number;
  editorialLens: string | null;
  phugialyTake: string | null;
  fieldNoteCount: number;
}): number {
  const referenceDate = new Date(article.publishedAt || article.createdAt).getTime();
  const daysSincePublish = Math.max(0, (Date.now() - referenceDate) / (1000 * 60 * 60 * 24));
  const recencyScore =
    Math.max(0, 1 - daysSincePublish / RECENCY_DECAY_DAYS) * RECENCY_WEIGHT;

  const engagementScore =
    Math.log10(1 + (article.views || 0)) * VIEWS_WEIGHT +
    Math.log10(1 + article.clickCount) * CLICKS_WEIGHT;

  const curationBoost =
    (article.editorialLens ? LENS_BOOST : 0) +
    (article.phugialyTake ? TAKE_BOOST : 0) +
    (article.fieldNoteCount > 0 ? FIELD_NOTE_BOOST : 0);

  return Math.round((recencyScore + engagementScore + curationBoost) * 100) / 100;
}

/**
 * Recomputes rank_score for every published article from signals already
 * tracked elsewhere (views, affiliate clicks, editorial curation, Field
 * Notes) -- run daily via the rerank-articles cron. Homepage reads the
 * result; /blog's chronological archive is untouched.
 */
export async function rerankPublishedArticles(): Promise<{ updated: number }> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, slug, published_at, created_at, views, editorial_lens, phugialy_take")
    .eq("status", "published");

  if (articlesError) {
    throw articlesError;
  }

  // Field Notes can now link to more than one article (thread_articles),
  // so this counts join rows for published notes rather than reading a
  // single article_id off threads directly.
  const { data: publishedThreadRows, error: publishedThreadsError } = await supabase
    .from("threads")
    .select("id")
    .eq("status", "published");

  if (publishedThreadsError) {
    throw publishedThreadsError;
  }

  const publishedThreadIds = (publishedThreadRows || []).map((row) => row.id);
  const fieldNoteCounts = new Map<string, number>();

  if (publishedThreadIds.length > 0) {
    const { data: threadArticleLinks, error: threadArticlesError } = await supabase
      .from("thread_articles")
      .select("article_id")
      .in("thread_id", publishedThreadIds);

    if (threadArticlesError) {
      throw threadArticlesError;
    }

    for (const row of threadArticleLinks || []) {
      if (row.article_id) {
        fieldNoteCounts.set(row.article_id, (fieldNoteCounts.get(row.article_id) || 0) + 1);
      }
    }
  }

  const { data: clicks, error: clicksError } = await supabase
    .from("affiliate_clicks")
    .select("article_slug")
    .eq("is_bot", false)
    .not("article_slug", "is", null);

  if (clicksError) {
    throw clicksError;
  }

  const clickCounts = new Map<string, number>();
  for (const row of clicks || []) {
    if (row.article_slug) {
      clickCounts.set(row.article_slug, (clickCounts.get(row.article_slug) || 0) + 1);
    }
  }

  let updated = 0;
  for (const article of articles || []) {
    const score = computeRankScore({
      publishedAt: article.published_at,
      createdAt: article.created_at,
      views: article.views,
      clickCount: clickCounts.get(article.slug) || 0,
      editorialLens: article.editorial_lens,
      phugialyTake: article.phugialy_take,
      fieldNoteCount: fieldNoteCounts.get(article.id) || 0,
    });

    const { error: updateError } = await supabase
      .from("articles")
      .update({ rank_score: score })
      .eq("id", article.id);

    if (updateError) {
      console.error(`Error updating rank_score for article ${article.id}:`, updateError);
      continue;
    }
    updated += 1;
  }

  return { updated };
}
