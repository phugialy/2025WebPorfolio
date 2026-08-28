---
description: Audit sitemap, breadcrumbs, and GSC connectivity after a batch of changes; fix and ship anything broken
---

Run the post-change SEO/discoverability check for phugialy.com. This exists
so "make sure GSC picks up our changes" doesn't need to be re-explained
every time — do all of the following, in order, and report findings before
fixing anything non-trivial:

1. **Sitemap audit** — fetch `https://phugialy.com/sitemap.xml` (or read
   `app/sitemap.xml/route.ts` directly). Confirm: every current static route
   is listed, `lastmod` on article URLs reflects `Math.max(updatedAt,
   publishDate || createdAt)` (not just publish date — a curated/edited
   article needs a fresh `lastmod` or Google has no freshness signal to
   recrawl on), and any newly added page/feature from this session has an
   entry with a sane `changefreq`/`priority`.

2. **robots.txt sanity check** — confirm `https://phugialy.com/robots.txt`
   (lives at `app/robots.txt/route.ts`) still references the sitemap and
   isn't accidentally disallowing anything that should be indexed.

3. **Breadcrumb / structured data audit** — grep for `BreadcrumbList` across
   `app/**/*.tsx` and spot-check that the JSON-LD trail (Home → lane/topic →
   page) matches what's visually rendered and what the current routing
   actually is. This matters most after any IA change (new page type, lane
   rename, moved route).

4. **GSC connectivity check** — do NOT try to curl `/api/cron/gsc-diagnostics`
   with a guessed or pulled `CRON_SECRET` (handling that secret is out of
   bounds). Instead: `vercel env pull` the two `GSC_SERVICE_ACCOUNT_*`
   values into a gitignored temp file, run a throwaway script that mirrors
   `lib/gsc.ts`'s exact JWT-signing + token-exchange + searchAnalytics-query
   logic, print only the safe shape diagnostic (`emailPresent`,
   `emailLooksValid`, `keyLength`, marker checks — never the raw key) plus
   per-candidate-siteUrl ok/error, then immediately delete the pulled env
   file and the script. This directly tests whether the real credential
   works without ever touching `CRON_SECRET`.
   - Alternative once `cron_runs` (migration 0008) is confirmed run: just
     query that table via the service-role key instead — no key-pulling
     needed at all if the daily cron has already fired.

5. **Report, then fix** — summarize what's broken/stale in plain terms (not
   raw diffs). For anything code-fixable (sitemap logic, robots.txt,
   breadcrumb markup), typecheck + eslint the touched files, then follow the
   standard deploy ritual: commit → push → `vercel --prod --yes` → alias
   both `phugialy.com` and `www.phugialy.com`. For anything that isn't
   code-fixable (the GSC key itself, a missing migration confirmation),
   report it as a blocker and name exactly what's needed from the user —
   don't attempt to work around it.
