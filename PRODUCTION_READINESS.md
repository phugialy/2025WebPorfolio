# Production Readiness

## Current Rollout Strategy

The article system is intentionally hybrid:

1. Supabase is the new article automation system.
2. Convex remains the fallback for existing blog content.
3. The app de-duplicates articles by `slug`.
4. Supabase wins when both systems have the same slug.

This makes the migration reversible while the new cron pipeline proves itself.

## Required Vercel Environment Variables

Set these on the Vercel project `2025-web-porfolio` for Production, Preview, and Development:

```bash
SUPABASE_URL=https://ggohmlweseblwxmukvnk.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://ggohmlweseblwxmukvnk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase API settings>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase API settings>
SUPABASE_ARTICLE_IMAGE_BUCKET=article-images
ARTICLES_CONTENT_SOURCE=hybrid
CRON_SECRET=<strong random secret>
BLOG_CRON_SECRET=<same as CRON_SECRET or another strong secret>
```

Keep existing Convex variables until the blog migration has been verified in production.

Set `ARTICLES_CONTENT_SOURCE=supabase` after production verification if you want the public blog to read only from Supabase and stop using Convex fallback content.

## Required Supabase Edge Function Secrets

Set these in Supabase Edge Function secrets:

```bash
SUPABASE_URL=https://ggohmlweseblwxmukvnk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase API settings>
CRON_SECRET=<same production cron secret>
BLOG_CRON_SECRET=<same production cron secret>
BLOG_INGEST_API_KEY=<same value used by the website ingest route>
```

## Production Verification

After deploying:

1. Visit `/api/articles`.
2. Confirm it returns JSON with existing posts.
3. Trigger `/api/cron/harvest-rss` with `Authorization: Bearer <CRON_SECRET>`.
4. Confirm new rows appear in Supabase `articles` with:
   - `status = draft`
   - `portfolio_lane` populated
   - `editorial_framework = practical-ai-automation-notes-v1`
   - `image_prompts` containing 1-3 prompt plans
5. Review one draft in Supabase.
6. Change it to `approved`.
7. Trigger `/api/cron/publish-due`.
8. Confirm the article appears on `/blog`.

Default Vercel cron setup:

- `/api/cron/article-pipeline`: daily at 08:00 UTC.
- `/api/cron/publish-due`: daily at 14:00 UTC.

The consolidated pipeline runs harvest, image prompt prep, due publishing, and site sync. The individual endpoints remain available for manual testing.

Optional image pass:

1. Trigger `/api/cron/prepare-images` with `Authorization: Bearer <CRON_SECRET>`.
2. Confirm older drafts now have `image_prompts`.
3. Add a public `main thumbnail` image URL to `hero_image_url`.
4. Optionally add an `inside paper visual` and `closing highlight visual` to `image_assets`.
5. Confirm the hero and supporting visuals render on `/blog/[slug]`.

Cloud storage workaround:

- Use Supabase Storage bucket `article-images`.
- Public visitors only read generated image URLs.
- Uploads happen through `POST /api/articles/[slug]/images` with the cron/API secret.
- The endpoint accepts either `sourceUrl` or `dataUrl`, uploads to Supabase Storage, then updates `hero_image_url` and `image_assets`.
- This avoids depending on Vercel's ephemeral filesystem in production.

## Rollback

If Supabase article reads misbehave:

1. Set `ARTICLES_CONTENT_SOURCE=hybrid`.
2. Keep or restore the Convex env vars.
3. Redeploy.
4. The app merges Supabase first and Convex fallback second.

Do not remove Convex env vars until the Supabase migration is complete.

## Known Non-Blocking Issue

`pnpm lint` currently fails on pre-existing Convex/script lint issues. `pnpm build` and `pnpm typecheck` pass.
