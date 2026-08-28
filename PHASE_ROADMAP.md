# Phugialy redesign — phase checklist

Tracks the IA/UX + affiliate rollout discussed in-session. Article generation
(the "V1" pipeline in `content-protocols/`) and article body content are
frozen throughout every phase below — nothing here touches that.

## Phase 1 — Information architecture (done)

- [x] Canonical lane/taxonomy module (`lib/lanes.ts`), replacing 3 duplicated
      definitions (missed `app/blog/page.tsx`'s copy the first pass — caught
      and fixed while building Phase 3).
- [x] Hub landing pages at `/topics/[lane]`, server-rendered.
- [x] Article breadcrumb: `Home / Hub (linked) / Article title`.
- [x] `BreadcrumbList` JSON-LD on both article and hub pages, alongside the
      existing `Article` JSON-LD.
- [x] "Back to hub" link added to the existing `KeepReadingPanel` (kept the
      panel, didn't rebuild it — it already did related-post/exit-path work).
- [x] Homepage's decorative 3-lane cards now link to real `/topics/[lane]`
      pages instead of generic `/blog`.
- [x] Hub URLs added to `sitemap.xml`.
- [ ] **You check:** load `/topics/applied-ai` (or another lane) and an
      article page in a browser — this was verified by typecheck + lint only,
      not click-tested, because local `next dev`/`next build` currently crash
      on this machine (`EPERM` renaming files in `.next/`, likely antivirus —
      confirmed unrelated to this session's code).
- [ ] Deferred on purpose: a second "Topic" tier under Hub — no real subtopic
      data exists yet; revisit once content strategy is more deliberate.

## Phase 2 — Affiliate foundation (done, one manual step left)

- [x] **Placement moved from bottom to mid-article (2026-08-25).** Research
      (scroll-depth data + ad-placement studies) showed the old
      end-of-article position was invisible to most readers (average scroll
      depth ~50-55%) and that mid-content placement outperforms both top and
      bottom for engagement. `splitAtFirstSection()` now splits the article
      right after its first H2 section and inserts the resource card there,
      falling back to the old end-of-article position only for short
      articles with fewer than two sections. Content itself is untouched —
      only where rendering pauses to insert the card changed.

- [x] Resource data model — already existed as scaffolding
      (`affiliate_products`, `article_affiliate_products`, `affiliate_clicks`
      in `supabase/migrations/0001_affiliate_layer.sql`); reviewed, not
      rebuilt.
- [x] Reusable resource card (`components/affiliate/affiliate-product-card.tsx`)
      — already existed; confirmed it matches the "editorial, not ad" mockup
      style agreed on earlier.
- [x] Disclosure system — added the missing second disclosure line (AI-assisted
      content, distinct from the affiliate-relationship disclosure) per the
      2026 FTC guidance found earlier.
- [x] Article → Resource relationship — already existed via
      `article_affiliate_products`, approval-gated (`approved` boolean).
- [x] Matcher tightened to match what was actually agreed on, not just what
      was scaffolded:
  - Max 1 resource per article (was 3).
  - Minimum match-quality threshold added (was: any overlap > 0 counted).
  - `match_reason` now names the actual overlapping tags/lane instead of a
    bare score, so it's reviewable at approval time.
  - Vendor-concentration cap: no product gets matched past ~20% share of the
    last 90 days of matches, once there's enough sample size to matter.
- [x] Migration applied — confirmed directly via API, all 3 tables now
      return HTTP 200 (previously 404). Tables are empty (0 rows), as
      expected for a fresh migration.
- [x] **End-to-end live test passed (2026-08-25).** Added a real product
      (an O'Reilly AI Engineering book, sourced via a live Canopy API search)
      and manually approved a match to a real published article. Confirmed
      live on production: resource card renders on the article page, the
      tracked go-link redirects to the correctly tagged Amazon URL, and the
      click logged to `affiliate_clicks` with the right product/article.
      Full loop proven with real data, not assumed.
- [x] **Fixed along the way:** Production's `SUPABASE_URL` had been pointing
      at the old (pre-migration) Supabase project this whole time — a
      leftover from before tonight's migration work. All four related env
      vars (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are now
      consistently set to the new project on Production.
- [ ] Still open: nothing in the catalog is discovered/matched automatically
      yet — the one live product was added and approved by hand as a test.
      The matcher cron (`/api/cron/affiliate-match`) also still isn't on
      any schedule (see earlier note) — add it to `vercel.json` when ready
      to stop doing matches manually.

## Phase 3 — Resource discovery (done)

- [x] `/resources` page — grouped by category, server-rendered.
- [x] Resource categories — grouped by the existing free-text `category`
      field on `affiliate_products`. No fixed taxonomy yet since the catalog
      is empty; revisit once there's enough real data to see if categories
      drift/duplicate (e.g. "AI Tools" vs "ai tools").
- [x] Resource detail pages at `/resources/[id]` — shipped for every active
      product rather than "selectively," since the catalog is empty today so
      thin-page bloat isn't a real risk yet. Revisit the selectivity question
      once the catalog has real volume.
- [x] Related-resources cross-links (same-category, on the detail page).
- [x] Article → Resource cross-navigation — the in-article resource card now
      has a second, internal "More about this tool" link to the detail page,
      separate from the tracked external "View product" link.
- [x] Blog-listing resource card placement — one card per 5 articles max
      (global index across pagination, not per-page), skipped entirely while
      a search query is active, resource picks rotate through the active
      catalog. Renders nothing today since the catalog is empty — verified
      the empty-state path is graceful, not a visible bug.
- [x] Sitemap: `/resources` and each `/resources/[id]` added.
- [ ] **You check:** once there's at least one active product, load
      `/resources`, click into a detail page, and confirm "Referenced in" /
      "Related resources" populate correctly once matches exist. Verified by
      typecheck + eslint only (both clean) — not click-tested, same local
      `.next` file-lock blocker as Phase 1.

## Phase 4 — Measurement (done)

- [x] **Decision made:** GA4 custom events, not Vercel Web Analytics (not
      enabled on this project, would need a dashboard toggle plus a new
      package) and not a new first-party events table (would duplicate what
      GA4 already reports, for no real benefit on non-revenue nav data).
      GA4 is already fully wired (`components/analytics/google-analytics.tsx`)
      — this is the zero-new-infrastructure option, and gives you a real
      dashboard to look at without me building one.
- [x] New `lib/analytics.ts` — `trackNavigationEvent()`, a thin safe wrapper
      around the existing `window.gtag`. No-ops if GA isn't loaded (no
      measurement ID, ad-blocker, etc.) instead of throwing.
- [x] New `components/analytics/tracked-link.tsx` — a `next/link` wrapper
      that fires a GA4 event on click without blocking navigation. Used
      everywhere below instead of hand-rolling `onClick` per link.
- [x] Article → Article — every related/secondary/previous/next/latest-post
      link in `KeepReadingPanel` now fires `article_to_article` with
      `from_slug`/`to_slug`.
- [x] Article → Hub — both the breadcrumb's Hub link and `KeepReadingPanel`'s
      "Back to {hub}" link fire `article_to_hub` with `from_slug`/`to_hub`.
- [x] Article → Resource — the in-article resource card's "More about this
      tool" link fires `article_to_resource` with `from_slug`/`to_resource`.
- [x] Resource → affiliate destination — already covered, no change needed:
      `logAffiliateClick()` / the `affiliate_clicks` table has captured this
      since Phase 2.
- [ ] **You check:** once GA4 has a few real days of traffic, look for
      `article_to_article`, `article_to_hub`, and `article_to_resource` as
      custom events in GA4 (Reports → Engagement → Events, or Realtime while
      testing). Not click-tested locally, same `.next` file-lock blocker as
      every other phase — typecheck + eslint both clean.

## Phase 5 — AI Opportunity Brief intake (done)

Implements EP-01 from the separate "Phugialy Direction" business roadmap
(not tracked in this file's phases otherwise — see that doc for the
positioning/offer-ladder context this serves).

- [x] `/opportunity` — public branching intake: "What are you trying to do
      with AI?" (4 cards matching the four doorways from that roadmap's §01),
      then a shared form (company/context, current workflow, pain points,
      budget, desired outcome) ending in "Request My AI Opportunity Brief."
      Deliberately no payment/checkout step — delivery is manual for now,
      this only tests willingness to request applied judgment.
- [x] `app/api/opportunity/route.ts` — validates, emails the owner the full
      structured intake, sends the requester a confirmation. Mirrors
      `app/api/contact/route.ts`'s Resend pattern exactly, new route because
      the fields and copy differ meaningfully from the general contact form.
- [x] New GA4 events: `opportunity_intent_selected` (fires per doorway card,
      so drop-off before the form is visible) and `opportunity_brief_requested`
      (fires on successful submit) — added to `lib/analytics.ts`'s existing
      `trackNavigationEvent()`, no new infra.
- [x] Homepage's "Talk Through an AI Opportunity" CTA (the one already
      tagged `commercial_cta_click`) now points at `/opportunity` instead of
      the generic `/contact` form. The hero's "Start Conversation" CTA stays
      on `/contact` — that one's for general inquiries, not this test.
- [x] Added to `sitemap.xml`.
- [x] Every article now carries a quiet, always-present "Ask Phugialy" text
      link (not a card, not part of the curated Pick/Field-Note rail)
      pointing at `/opportunity?from=article&article={slug}` — the article
      slug flows into the existing `source` field so owner-notification
      emails show which piece prompted the request.
- [x] Typecheck + eslint both clean. Not click-tested — same local `.next`
      file-lock blocker as every other phase, plus another session had the
      dev server running on this port during this work.
- [ ] **You check:** submit a real test request through `/opportunity` and
      confirm both emails (owner notification + requester confirmation)
      actually arrive via Resend.

## All five phases are now built

Remaining manual/verification items are marked "You check" above in each
phase — nothing else is blocking further work on this roadmap.

## Separately tracked, not part of this roadmap

- Vercel Preview environment missing Supabase/OpenRouter env vars — blocks
  testing the pipeline on Preview before promoting to Production.
- Confirming Production's `SUPABASE_URL` actually points at the new project
  (`ggohmlweseblwxmukvnk`) before promoting the pending deployment.
- Old-article image backfill — explicitly deprioritized ("leave it the same,
  it's fine").
- **Three taxonomies now exist and don't match** (flagged 2026-08-28 by the
  ai-blog-publisher/content-engine session, "V1-AI-blog"): (1) this repo's
  live `lib/lanes.ts` — 5 lanes (ai-advancement, applied-ai, how-to-ai,
  vibe-coding-codex, dfw-commercial) that actually drive `/topics/[lane]`
  hub pages, breadcrumbs, and the sitemap; (2) a new 14-16 genre-level
  content-selection taxonomy that session is building from the real
  discovered-insight corpus, scored against GSC data where volume allows,
  used to decide what to write next; (3) an 8-category "reader-facing hub"
  structure (Agents & Automation, Models & Research, Infrastructure,
  Building with AI, Business & Industry, Media & Creativity, Trust &
  Governance, Robotics) sketched separately in that same conversation.
  Their point, and it's correct: an internal content-selection taxonomy in
  a backend config does nothing for GSC/topical-authority on its own — only
  real site structure (hub pages, internal links, sitemap entries) counts.
  So there's a real future decision on whether/how the 5-lane structure
  should evolve to reconcile with one of the other two. Not actionable yet
  — their coverage-gap numbers aren't validated (a background classification
  run was still finishing, some categories skipped on local-model timeouts).
  Revisit once they share the full taxonomy + gap data.
- **Field Notes discussion (accounts + replies) — designed, not started.**
  Full spec at `docs/field-notes-discussion-design.md`: real user accounts
  (Supabase Auth, magic link), users can reply under a Field Note, but only
  admin can start a thread. Explicitly deferred until Phase 1/2 (presentation
  + measurement) show real engagement — don't build accounts infrastructure
  before there's evidence anyone would use it.
