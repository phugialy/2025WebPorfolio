# Supabase Article Automation

This project is connected to Supabase project `ggohmlweseblwxmukvnk` (migrated from the earlier `eyuiavcfbybwcbldevbf` project).

## What Exists

- `article_sources`: RSS/source configuration.
- `articles`: draft, scheduled, and published article content.
- `article_runs`: automation run logs.
- `sites`: downstream site targets.
- `article_publications`: per-site sync status.

## Editorial Framework

The automation now drafts articles for the series:

**Practical AI & Automation Notes**

Default promise:

> No hype. No empty AI summaries. Each article connects a real trend, tool, or project idea to practical software implementation.

Portfolio topic lanes:

- `AI Advancement`
- `Applied AI`
- `How-to-AI`
- `Vibe-coding / Codex`
- `DFW Commercial Projects + Sales`

Each generated draft follows these rules:

- 30% reference, 70% Phu perspective.
- Sources are inputs, not the article.
- Every draft must answer: what did I learn, what do I think, and how would I apply it?
- Every draft includes a practical example, limitation/guardrail, and next step.
- Drafts default to `status = draft` and should be reviewed before publishing.
- Drafts include `portfolio_lane`, `editorial_score`, and `editorial_framework` metadata.
- Drafts include 1-3 `image_prompts` following the portfolio image guardrails.

Soft structure:

- The problem
- What I noticed
- Where AI fits
- My working approach
- Practical example
- What I would avoid
- Try this next

## Local/Vercel API Routes

- `GET /api/articles`: merged Supabase + Convex article feed.
- `POST /api/blog/ingest`: saves articles to Supabase when `SUPABASE_SERVICE_ROLE_KEY` exists, otherwise falls back to Convex.
- `GET|POST /api/cron/harvest-rss`: fetches configured RSS sources into Supabase drafts.
- `GET|POST /api/cron/prepare-images`: backfills missing article image prompts.
- `GET|POST /api/cron/publish-due`: publishes approved/scheduled articles whose `publish_at` is due.
- `GET|POST /api/cron/sync-sites`: posts published articles to enabled site ingest endpoints.
- `GET|POST /api/cron/article-pipeline`: consolidated production cron that runs harvest, image prompt prep, due publishing, and site sync.

See `PRODUCTION_READINESS.md` for the required Vercel and Supabase secrets before enabling production cron runs.

Set `ARTICLES_CONTENT_SOURCE=supabase` to make the public blog read Supabase only. Leave it as `hybrid` while using Convex as a fallback.

## Supabase Edge Functions

These are deployed in Supabase:

- `draft-article`
- `harvest-rss`
- `publish-due-articles`
- `sync-sites`

They require one of these secrets to authorize requests:

- `CRON_SECRET`
- `BLOG_CRON_SECRET`
- `BLOG_INGEST_API_KEY`

Set them in Supabase before invoking the functions directly.

## Vercel Cron

`vercel.json` schedules the consolidated production-safe setup:

- `article-pipeline`: daily at 08:00 UTC
- `publish-due`: daily at 14:00 UTC

Vercel cron endpoints expect `CRON_SECRET`, `BLOG_CRON_SECRET`, or `BLOG_INGEST_API_KEY` in the environment.

The individual cron endpoints remain available for manual runs or a future Pro-plan schedule. The consolidated setup keeps the default deployment within tighter Vercel cron limits.

## Article Image Guardrails

Each article can carry 1-3 AI image prompt plans:

- 1 image: `main thumbnail` for the blog hero/card and social-preview style surfaces.
- 2 images: `main thumbnail` plus `inside paper visual` that supports the article content.
- 3 images max: add `closing highlight visual` only when the conclusion needs a final visual anchor.

Default style:

Premium editorial technology visual, modern professional blog style, refined composition, soft but confident lighting, subtle gradients, realistic workspace or workflow details, polished but not overly corporate, suitable for an AI and software engineering portfolio, clear focal point, high visual clarity, no clutter, no readable text, no logos, no brand names.

Generated prompts must give the image a reader benefit: attract, clarify, or reinforce a takeaway. Avoid random robots, glowing brains unless needed, messy code walls, fake dashboards with unreadable text, brand logos, exaggerated sci-fi, cyberpunk overload, childish cartoon style, generic stock-photo scenes, hands with too many fingers, and text inside the image.

Current implementation stores:

- `image_prompts`: generated prompt plans.
- `image_assets`: generated/uploaded asset metadata.
- `hero_image_url`: the public image URL rendered on the blog page when available.

This keeps article review separate from image publishing: prompts can be changed before image assets are generated or shown.

## Storage Workaround

Images are stored in Supabase Storage bucket `article-images`.

Use `POST /api/articles/[slug]/images` with `Authorization: Bearer <CRON_SECRET>` to upload an image after review.

Request body examples:

```json
{
  "role": "hero image",
  "sourceUrl": "https://example.com/generated-image.webp",
  "alt": "Hero image for the article",
  "prompt": "The prompt used to generate this image"
}
```

or:

```json
{
  "role": "hero image",
  "dataUrl": "data:image/png;base64,...",
  "alt": "Hero image for the article"
}
```

The route uploads the file to Supabase Storage, stores the image metadata in `image_assets`, and sets `hero_image_url` for the article. The site renders the hero only when that URL exists.
