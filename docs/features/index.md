# Feature ledger

One row per feature that has entered the research/dev pipeline. This is the
scannable summary — the linked docs under `docs/research/` and
`docs/decisions/` remain the detailed source of truth; this file never
duplicates their content, only points at it. Every skill in the pipeline
(`research-features`, and eventually `plan-feature`/`build-feature`/
`validate-feature`/`ship-feature`) updates its feature's row when it
finishes its stage.

## Status vocabulary

| Status | Meaning |
|---|---|
| Researched | `research-features` ran; options/ADR recorded, no build decision yet |
| Planned | A decision was made (ADR in `docs/decisions/`), awaiting Plan Mode approval |
| Approved | Human approved the plan — cleared to build |
| Building | Implementation in progress |
| Built | Code + tests written, awaiting validation |
| Validated | Tests + browser verification passed, awaiting push approval |
| Shipped | Pushed to production |
| Shelved | Deliberately paused — not a failure, a judgment call, reason recorded |
| Blocked | Stopped on a hard dependency/sequencing conflict, not a judgment call |

## Features

| Feature | Project | Status | Completed | Goal | Details |
|---|---|---|---|---|---|
| GSC trend admin view | phugialy.com | Building (stalled) | — | Surface the 90-day GSC trend `gsc-diagnostics` already computes but discards, so it's visible without re-running the cron manually. | [research](../research/gsc-trend-admin-view.md) · [decision](../decisions/gsc-trend-admin-view.md) |
| Social agent: admin dashboard + settings UI | phugialy.com | Built | — | Two new browser admin surfaces (`/admin/social/dashboard` read-only, `/admin/social/settings` editable brand profile) onto the already-built social media manager agent's existing data/logic — no new backend capability. | [research (parent feature)](../research/social-media-manager-agent.md) · [decision](../decisions/social-admin-dashboard-settings.md) |
| Social agent: MCP `approve_post` two-step confirmation | phugialy.com | Built | — | Defense-in-depth on the MCP server's `approve_post` tool: require a second, code-confirmed call before it approves (and can eventually publish) a post, so no single tool call is ever sufficient regardless of the calling client's own gate. | [research (parent feature)](../research/social-media-manager-agent.md) · [decision](../decisions/mcp-approve-post-confirmation.md) |
| Merch storefront (Stripe + Printify) | phugialy.com | Shelved | 2026-09-08 | User asked for a merch shop instead of a subscription paywall. | [research](../research/merch-shop-vs-subscription.md) · [decision](../decisions/merch-shop.md) · [backlog spec](../research/merch-storefront-stripe-printify-backlog.md) |
| Personalized recommendations | phugialy.com | Researched (on hold) | — | Explore "related articles"/personalization now that reading behavior could theoretically be tracked. | [research](../research/personalized-recommendations.md) |
| Reader retention: RSS discoverability + email join | phugialy.com | Researched | — | RSS feed exists but is undiscoverable; no email capture exists at all. Add both, auto-adapting to newly published articles, plus a defined range for graduating to a full subscription system. | [research](../research/reader-retention-email-rss.md) |

---

### GSC trend admin view

- **Project:** phugialy.com
- **Reason:** the cron already computes a 90-day daily trend on every run but discards it after logging only a connectivity check — no way to see it after the fact.
- **Goal:** an admin-only view at `/admin/seo` showing the trend, refreshed daily, doubling as a live confirmation of GSC credential health.
- **Elaboration:** ADR recommended persisting `dailyTrend` into `cron_runs.summary` and reading the latest row (over a live per-page-load GSC query or a new charting dependency) — small effort, reuses existing `cron_runs`/admin-auth patterns, zero new infra. Plan was approved via Plan Mode. Build stalled mid-Phase-2 on a denied file edit and hasn't resumed yet — not shelved, not blocked, just incomplete.

### Social agent: admin dashboard + settings UI

- **Project:** phugialy.com
- **Reason:** the social media manager agent subsystem (see the parent
  research doc) already has an approval queue and an MCP server for
  Hippo-Assist, but no glanceable read-only health view and no
  browser-based way for a human operator to edit the brand profile without
  going through a conversational client.
- **Goal:** `/admin/social/dashboard` (recent runs, guardrail config, brand
  profile, queue depth, trailing 24h spend vs. cap, all read-only) and
  `/admin/social/settings` (editable voice/tone/banned-topics/disclosure
  form), plus a minimal `/admin/social` index.
- **Elaboration:** pure viewing/editing surface onto already-built backend
  capability — reuses `getRecentRuns`, `getGuardrailConfig`,
  `getBrandProfile`/`updateBrandProfile`, `listGuardrailPendingQueue`, and
  the watchdog's `evaluateSocialWatchdog` verbatim, no reimplementation.
  Guardrail numeric thresholds remain structurally unreachable through the
  settings route (no field, no import of those constants). Built, tested
  (133 pre-existing + new settings-route tests, all passing), typecheck/
  lint clean, browser-verified (both pages correctly redirect to admin
  sign-in unauthenticated). Not yet deployed — see the build report for
  what's pending.

### Social agent: MCP `approve_post` two-step confirmation

- **Project:** phugialy.com
- **Reason:** Hippo-Assist (the separate project that consumes this MCP
  server) has its own client-side consent gate before calling `approve_post`,
  but this server had no protection of its own — one tool call was
  sufficient to move a post to `approved`, which the pipeline's next tick
  publishes to a real, live-connected Facebook/Instagram account.
- **Goal:** make `approve_post` require two calls — the first issues a
  short numeric confirmation code and changes nothing; only a second call
  with that exact, unexpired code actually approves. Scoped only to this one
  MCP tool; the browser admin UI's Approve action is untouched.
- **Elaboration:** two new nullable `social_posts` columns
  (`approval_confirmation_code`, `approval_confirmation_expires_at`) via a
  new migration (`0018_social_posts_approval_confirmation.sql`, written, not
  applied); a portable `social-agent/mcp/approval-confirmation.ts` helper
  (Store-port-only, same discipline as the rest of `social-agent/mcp/`);
  `route.ts`'s `approve_post` tool updated to call it before
  `applyQueueAction`, with its `description`/`inputSchema`/`outputSchema`
  documenting the two-step flow for any MCP client. `applyQueueAction` and
  the admin UI are byte-for-byte unchanged. Built, tested (new
  `approval-confirmation.test.ts`, all pre-existing tests still green),
  typecheck/lint clean. Migration not applied — see the build report for
  the exact instructions handed off.

### Merch storefront (Stripe + Printify)

- **Project:** phugialy.com
- **Reason:** came up as an alternative to a subscription/paywall during a monetization discussion.
- **Goal:** a real integrated storefront — Stripe Checkout for payment, Printify for print-on-demand fulfillment, an admin app to manage catalog and orders.
- **Elaboration:** research recommended a low-risk hosted link-out (Fourthwall-style) instead; user explicitly chose the larger integrated build anyway, which was recorded as the actual ADR decision along with the real financial/compliance risk it introduces. A same-day traffic check found near-zero organic search clicks, which became the actual blocker — not sequencing mechanics, which were mostly already clear. Shelved deliberately, with the full build plan preserved in the backlog spec so it can be picked up without redoing the design work if traffic recovers.

### Personalized recommendations

- **Project:** phugialy.com
- **Reason:** explored while thinking through what "personalization" could look like for the site.
- **Goal:** related-articles/recommendation surface for readers.
- **Elaboration:** codebase audit found no reading-history tracking exists for any user/session — the real gap isn't the recommendation algorithm, it's that nothing records what a given visitor read. Recommended holding until GSC/instrumentation sequencing is confirmed live, since this is presentation-facing work. Status unchanged since research; no plan/build attempted.

### Reader retention: RSS discoverability + email join

- **Project:** phugialy.com
- **Reason:** a retention audit found new-user acquisition is healthy (75+/151 weekly users) but the site has zero working return-visit mechanisms — the RSS feed is correctly built but undiscoverable (no `<link rel="alternate">`, no visible link anywhere), and the accounts/reply system has 0 profiles and 0 replies ever.
- **Goal:** fix RSS discoverability, add a simple email "join" (not a full subscription system) as a second channel, both auto-adapting to newly published articles with zero manual curation.
- **Elaboration:** external research found RSS actually outperforms email for retention when discoverable (~10x reads/post, ~1/8 churn), so the RSS fix is the highest-leverage/lowest-effort item. Email is designed as a weekly digest (not per-article, to avoid fatigue at the current 5-10 articles/day publish rate) querying "everything published since the last run" — inherently auto-adapting. A concrete range was set for graduating to a full subscription/preference system: ~50-150 active subscribers or 4-8 weeks of stable sending, whichever comes first, gated on real open/click engagement rather than just signups. Not yet approved via Plan Mode; no code written.
