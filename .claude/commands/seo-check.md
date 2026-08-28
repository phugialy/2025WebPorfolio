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

4. **GSC connectivity check** — do NOT `vercel env pull` a secret and try to
   use it in a local script. This was tried (2026-08-28) and produces a
   false negative every time: this environment's own sandbox redacts any
   value it recognizes as a secret, silently substituting the literal
   11-character string `[SENSITIVE]` before the script ever sees it — so
   every such attempt reports a suspicious ~11-character "key" and every
   downstream API call 401s, regardless of whether the real credential is
   fine. (This is exactly what happened investigating both
   `GSC_SERVICE_ACCOUNT_PRIVATE_KEY` and `CANOPY_API_KEY` that day — both
   "broken key" findings from that method were wrong.) Do NOT try to guess
   or curl `/api/cron/gsc-diagnostics` with `CRON_SECRET` either (handling
   that secret is out of bounds).
   - The only reliable check: the credential only ever gets used for real
     inside Vercel's own runtime (a deployed cron or route), which is not
     sandboxed the way local tool calls are. So verify via a *result*, not
     by touching the value: confirm `cron_runs` (migration 0008) has a row
     for `gsc-diagnostics` with `ok: true` after the daily cron fires (or
     ask the user to trigger it manually from the Vercel dashboard's Cron
     Jobs tab), then read that row via the service-role key — no secret
     ever needs to be pulled or handled.
   - Same logic applies to any other prod-only secret (e.g. `CANOPY_API_KEY`)
     — verify via a real deployed code path's output, never via a locally
     pulled value.

5. **Report, then fix** — summarize what's broken/stale in plain terms (not
   raw diffs). For anything code-fixable (sitemap logic, robots.txt,
   breadcrumb markup), typecheck + eslint the touched files, then follow the
   standard deploy ritual: commit → push → `vercel --prod --yes` → alias
   both `phugialy.com` and `www.phugialy.com`. For anything that isn't
   code-fixable (the GSC key itself, a missing migration confirmation),
   report it as a blocker and name exactly what's needed from the user —
   don't attempt to work around it.
