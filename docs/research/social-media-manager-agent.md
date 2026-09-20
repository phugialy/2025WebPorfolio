# Research: 24/7 social media manager agent

Status: Researched and substantially built — pipeline, guardrails, admin
queue UI, reliability watchdog, a real Zernio `Platform` adapter (two
live-connected accounts: Facebook Page "Hippo On Tech", Instagram Business
@hippo_blog_phugialy), and an MCP server (9 tools + 3 resources) for
Hippo-Assist. 133/133 tests passing, clean typecheck/lint, independently
re-verified at every step, not self-reported. The foundation migration
(`0017_social_agent_foundation.sql`) is applied and RLS-verified live. See
"Implementation status" near the end of this doc for the full build
history and what's still pending.

## Context

An add-on system that runs as a standing social media manager for
phugialy.com and LinkedIn (then Instagram/Facebook, extensible toward "full
[Zernio](https://zernio.com/) capability"), against views/CTR/engagement/
traffic goals. Triggered every 1–2 hours, built from scoped steps with
guardrails, each step's output determining whether the next step runs.
Compute stays in this repo (phugialy-profile). Target spend ~$1/day
OpenRouter tokens; Zernio itself is a separate, small line item. Real
multi-tenant memory from day one (operator, social audience, and future
Zernio end-users all need to be modeled, not just the site owner's own
accounts).

## Tech stack — consolidated

Every piece below was already decided in the sections that follow; this is
a single, scannable reference so nobody (human or agent) has to reassemble
it from five different "Decision" sections before starting work.

| Layer | Choice | Where it was decided |
|---|---|---|
| Language/runtime | TypeScript, Next.js 15 App Router | Matches this repo; no new choice |
| Hosting | Vercel, same project as phugialy-profile (for now) | Scoping / Deployment plan |
| Database | Supabase Postgres, `social_*`-prefixed tables, service-role access only | Decision 4, Deployment plan |
| LLM | OpenRouter via `lib/openrouter.ts` (extended to accept a per-call model override), tiered by step: cheap model for signal-scan/guardrail, mid-tier for strategist/writer, existing article-tier model for weekly retro | Cost model |
| Social platform API | Zernio — REST + official `zernio-node` SDK, multi-tenant via Zernio Profiles, webhooks (HMAC-verified) for post-lifecycle/inbox/account events | Platform layer: Zernio |
| Trigger/scheduler | GitHub Actions `schedule` → `/api/cron/social-*`, reusing `isAuthorizedCronRequest`/`CRON_SECRET` | Decision 1 |
| Core architecture | Ports-and-adapters: `/social-agent/` top-level directory (`ports.ts` — `LLM`/`Store`/`Platform`/`AuthGate` interfaces), thin host-glue wiring under `app/` | Modularity |
| Orchestration model | `social_posts.status` state machine (`signal_gathered → briefed → drafted → guardrail_pending → approved → publishing → published`/`rejected`/`publish_failed`); each tick finds rows stuck in an actionable state, never "decides from scratch" | Pipeline architecture, External review |
| Guardrail/decision engine | Extends `content-agent-protocols.ts`'s typed-JSON-contract Critic pattern (`SocialGuardrailReview`), expanded with budget/repetition/escalation checks | Guardrails, External review |
| UI | Next.js admin pages under `/admin/social/*`, shadcn/ui (already used in this repo), ported/adapted from `moderation-board.tsx`, `seo-board.tsx`, and MIT-licensed `latewiz`/`unified-inbox` | Communication protocol / UI-UX, Prior art |
| Reliability | Watchdog cron (same shape as `site-health`) + real Resend alerting (`lib/email.ts`), webhook event-ID idempotency, cost caps mirroring `market-intelligence.ts`'s `MAX_CANDIDATES_PER_RUN` | Operational reliability |
| Testing | This repo's existing tooling (Vitest, Playwright) — no new framework | Matches this repo; no new choice |
| Deploy ritual | This project's existing `commit → push → vercel --prod --yes → alias both domains`, migrations handed off as SQL and verified via REST before dependent code ships | Deployment plan |

Nothing above is a new decision made in this table — it's every prior
Decision/section's conclusion, collected in one place. If anything here
looks wrong, it means one of the sections it's sourced from needs revisiting,
not that this table is inventing something new.

## What a social media manager does → agent tasks

| Human SMM day-to-day | Scoped agent task | Cadence |
|---|---|---|
| Scan what's trending | Signal scan — RSS + GSC query deltas, cheap model scores relevance | Every 1–2h tick |
| Decide what to post | Strategist — signals + recent performance + brand profile → 1 brief | Daily |
| Write platform-native copy | Platform Writer — one prompt per platform (IG/LinkedIn/X conventions differ) | Per approved brief |
| Brand safety / policy / disclosure check | Guardrail Critic — accept/revise/reject, hard-coded disclosure rule | Per draft |
| Schedule/publish | Publisher — Zernio `POST /v1/posts` | Per approved post |
| Reply to comments/DMs | Engagement — Zernio inbox webhook → draft → same guardrail → Zernio reply | Real-time (webhook-driven, not polled) |
| Pull performance | Performance sync — Zernio analytics API → `social_post_metrics` | Daily |
| Adjust strategy | Retro — weekly synthesis, proposes brand-profile edits as a pending diff | Weekly |

Structurally the same role pattern already in production for articles
([lib/content-agent-protocols.ts](../../lib/content-agent-protocols.ts):
Research → Writer → Critic → Revise → Image Director), extended with a
publish step, an engagement sub-loop, and a feedback loop the article
pipeline doesn't have.

## Codebase audit — what already exists to reuse

Next.js 15 + Supabase + Vercel, no queue, no persistent process, no social
code today. Directly reusable:

- **Guardrailed multi-step LLM pipeline**: [lib/content-agent-protocols.ts](../../lib/content-agent-protocols.ts)
  — strict JSON contracts, `safeJson` fallback, typed accept/revise/reject.
- **Discover-and-judge pattern**: [lib/market-intelligence.ts](../../lib/market-intelligence.ts)
  — propose, LLM-evaluate against named criteria, land as `inactive` until
  approved. Default-to-reject on parse failure, never default-to-approve.
- **Centralized OpenRouter client**: [lib/openrouter.ts](../../lib/openrouter.ts),
  per-call-type model config via env vars.
- **Cron-native orchestration**: every job is Vercel Cron → API route →
  `isAuthorizedCronRequest` (bearer vs. `CRON_SECRET`) → `logCronRun`
  ([lib/cron-log.ts](../../lib/cron-log.ts), [supabase/migrations/0008_cron_runs.sql](../../supabase/migrations/0008_cron_runs.sql)).
  All daily today; **[.github/workflows/auto_blog.yml](../../.github/workflows/auto_blog.yml)**
  proves GitHub Actions `schedule` works in this exact repo for sub-daily
  cadence.
- **Per-step failure isolation, proven twice**: [gsc-diagnostics/route.ts](../../app/api/cron/gsc-diagnostics/route.ts)
  tries 3 property formats independently, one failing doesn't kill the
  others; every route wraps its handler in try/catch and logs `ok: false`
  with the real error rather than crashing silently
  ([flag-underperforming/route.ts](../../app/api/cron/flag-underperforming/route.ts)).
- **Two directly-reusable admin UI patterns** (see UI/UX below):
  [app/admin/moderation/moderation-board.tsx](../../app/admin/moderation/moderation-board.tsx)
  (an approval/action queue) and
  [app/admin/seo/seo-board.tsx](../../app/admin/seo/seo-board.tsx) (a
  read-only metrics dashboard).
- **No server-side analytics store, no queue, no embeddings** — confirmed
  gaps, not assumptions.
- **`lib/trend-signals.ts` is a self-documented stub** — no free trends API
  exists; same gap applies to social trend discovery.

## Platform layer: Zernio

Confirmed by fetching zernio.com and its docs (not assumed): a unified
REST API + hosted MCP server for posting, scheduling, analytics, ads, and
inbox across 16 platforms.[^7]

**Multi-tenant model — "Profiles."** One profile per tenant/customer; a
tenant with 5 connected accounts across platforms is still one profile.
Concretely: `POST /v1/profiles` creates a tenant, `GET /v1/connect/{platform}?profileId=`
returns an OAuth `authUrl` to redirect the tenant through (Zernio owns the
OAuth flow entirely — this project only stores the returned `profileId`),
and an `account.connected` webhook confirms the link. This directly answers
Decision 4's multi-tenant question: **our `social_accounts` table just
stores a `zernio_profile_id` per tenant — it does not reimplement OAuth.**
API keys can be scoped per profile (`scope: "profiles"`, `permission: "read"`,
`disabledResourceGroups`) for later per-tenant access control.[^8]

**Webhooks — real-time, not just polling.** Zernio pushes events for post
lifecycle (`scheduled`/`published`/`failed`/`deleted`), inbox (new
messages/comments/reactions/reviews), and account connect/disconnect.
Deliveries are HMAC-SHA256 signed (`X-Zernio-Signature`), carry a dedup
event ID (`X-Zernio-Event-Id`), and retry up to 7x with backoff.[^9] This
changes the engagement design from the first pass: **new inbox items and
publish-failure detection arrive via a webhook endpoint
(`/api/webhooks/zernio`), not a polling loop** — lower latency, and publish
failures are reported directly instead of inferred. The 1–2h cron cadence
still owns the *drafting/planning* side (Strategist, Writer), which is
compute-bound work with nothing external to listen for.

**Rate limits — confirmed, not a constraint at this scale.** 60 req/min at
the free 0–2 account tier, up to 1,200 req/min at scale; posting velocity
capped at 25/hour/account, daily platform caps from 25 (Pinterest) to 250
(Threads).[^10] A 1–2h cadence producing at most a handful of posts/day per
tenant is nowhere near any of these ceilings — rate limiting is not a
design constraint for v1.

**Pricing**: 2 connected accounts free, then $1–6/account/month.[^7]

## Prior art — existing repos to build on, not just reference

Checked GitHub directly (license, activity, stars, actual README/code) rather
than assuming nothing exists. Three repos are genuinely reusable, one is a
useful reference only, and the discovery process surfaced a real, dated risk
worth folding into Open Dependencies below.

- **[zernio-dev/latewiz](https://github.com/zernio-dev/latewiz)** (MIT, 81★,
  pushed within days) — Zernio's own official open-source scheduler:
  Next.js 16 + Tailwind + shadcn/ui + TanStack Query + Zustand, with
  `compose/`, `calendar/`, `accounts/`, `queue/`, `settings/` routes and a
  one-click Vercel deploy. This is **the exact stack this repo already
  uses**, built by the platform vendor itself. Directly usable as the base
  for `/admin/social/accounts` (account connection) and a real reference
  implementation for `POST /v1/posts` wiring, instead of writing that
  client from scratch. It's a full scheduling app, not just a component
  library — the honest framing is "fork/vendor the parts that fit" (account
  connection, compose UI) rather than "adopt wholesale," since the
  guardrail/approval-queue piece (this project's actual differentiator)
  isn't in it — LateWiz posts directly, with no review gate.
- **[zernio-dev/unified-inbox](https://github.com/zernio-dev/unified-inbox)**
  (MIT, 35★) — official, stateless Next.js 15 WhatsApp-style inbox UI across
  7 platforms, polling every 5–10s, no database. Directly reusable as the
  visual base for the engagement surface — **but it sends messages
  directly with no guardrail step**, and its README says so explicitly
  ("no authentication layer of its own... deploy behind your own auth").
  Adapting it means inserting this project's guardrail gate between compose
  and send, and adding the auth this project already has (`admin-auth.ts`)
  in front of it — not using it as-is.
- **[zernio-dev/openapi-specs](https://github.com/zernio-dev/openapi-specs)**
  (MIT) — real, field-level OpenAPI specs per platform, maintained by
  Zernio, including `linkedin.yaml` confirming `POST /rest/posts` supports
  organization-authored posts (`author: "urn:li:organization:..."`) —
  **this resolves the "is LinkedIn company-page posting actually supported"
  open question from the first draft**, at the underlying-API level (still
  worth a live test, but it's no longer an unverified marketing claim).
  This closes the "exact request schema" gap flagged earlier — use this
  repo directly instead of re-fetching docs pages at build time.
- **[zernio-dev/zernio-node](https://github.com/zernio-dev/zernio-node)**
  (Apache-2.0, 43★, pushed within hours) — official Node SDK, the same one
  LateWiz itself uses. Use this instead of hand-writing `fetch` calls in a
  new `lib/zernio.ts`, the same way `lib/openrouter.ts` wraps OpenRouter's
  REST API today.
- **[langchain-ai/social-media-agent](https://github.com/langchain-ai/social-media-agent)**
  (MIT, 2,797★, very active) — reference only, not a base: different stack
  entirely (LangGraph server + Arcade for platform auth + FireCrawl, not
  Zernio, and needs a standing LangGraph server rather than this project's
  stateless-cron shape — the exact category rejected in Decision 1). Worth
  reading for one idea: its "Agent Inbox" human-in-the-loop review concept
  validates this doc's own approval-queue design independently, from a
  team with 2,797 stars solving the same core problem a different way.

### Fork/port strategy — what to take, and the honest limit of it

Fork or port specific routes into this repo (not track upstream — the data
model diverges the moment guardrail fields get added, so this is a one-time
port, not a maintained fork):

- **`latewiz/accounts/`** → `/admin/social/accounts`, near-direct port: list
  connected Zernio profiles, redirect to `GET /v1/connect/{platform}`'s
  `authUrl` to add one.
- **`latewiz/calendar/`** → visual shell for `/admin/social/queue`'s
  calendar view, repurposed to render agent-drafted/scheduled posts instead
  of manually-composed ones.
- **`latewiz/queue/` + `unified-inbox`'s thread UI** → the two closest
  starting points for the approval surfaces, but both need real surgery:
  latewiz's queue is "cancel/edit/reschedule a post *you* wrote," not
  "review what an agent drafted and see why the guardrail flagged it";
  unified-inbox sends directly with no gate and, by its own README, no auth
  layer — both need this project's guardrail state and `admin-auth.ts`
  wired in, not just visual reuse.
- **`latewiz/compose/`** → repurposed into a *different* role than intended:
  not the primary way a post gets created (the pipeline does that), but the
  "edit the agent's draft before approving" form inside the review queue —
  a human overriding an AI draft, not authoring one from scratch.

**The limit, stated plainly**: forking closes the UI-build-effort gap, not
the autonomy gap. Neither source repo has any decision-making in it — no
signal scan, no strategist, no writer, no guardrail critic. The actual
unique piece of this system — the agent drafting and self-checking before a
human ever sees it — has nothing to fork from either repo and remains this
project's own build on the already-proven `content-agent-protocols.ts`
pattern. The forked pieces become the cockpit that pipeline writes into,
not a source of autonomy themselves.

### Considered and rejected: a standing personal-agent framework as "the brain"

Evaluated two candidates explicitly considered for running the day-to-day
operation: **Hermes Agent** (Nous Research, MIT, Feb 2026) and **OpenClaw**
(formerly Clawdbot, MIT, Nov 2025) — both persistent, self-hosted,
general-purpose personal AI agents that execute commands, browse the web,
manage files, and connect to 16+ chat platforms, both with explosive
early adoption (60k–200k+ GitHub stars within weeks).

**Rejected as the core, for reasons consistent with every decision already
made in this doc, not a new standard**:

- Decision 1 already rejected the "standing persistent process" category
  (n8n/LangGraph/Temporal) specifically because this project has never run
  infrastructure outside Vercel + Supabase. Hermes/OpenClaw are the same
  category under a different brand.
- Blast radius: a general command-executing agent holding Zernio credentials
  is a categorically larger attack surface than this design's narrow,
  single-purpose, guardrail-gated steps — and that risk is sharper for
  software with weeks of track record and hype-velocity growth (100k stars
  in a week is a virality signal, not a maturity signal).
- Cost governance: this system's whole cost model is discrete, capped steps;
  a continuously-reasoning standing agent (Hermes alone is cited processing
  224B tokens/day network-wide) is architecturally the opposite of that.
- Unnecessary: `content-agent-protocols.ts`'s pattern already **is** the
  "brain" this system needs, just distributed across scoped steps instead
  of centralized into one always-on process.

**Not rejected forever** — the one narrow fit worth revisiting *after* the
core pipeline is proven: using one as a chat-based notification/approval
relay (get a guardrail-approved draft as a Telegram/WhatsApp message, reply
to approve) instead of, or alongside, the admin-page queue. That's a thin
messaging-relay role, not "make it the brain," and it's worth re-evaluating
their security/maturity posture again before adopting even that, given how
recent both projects are.

**Real finding worth flagging**: `openapi-specs`' own `DISCREPANCY-REPORT-V2.md`
(dated Feb 2026, methodology-checked against official platform docs, not
speculation) documents **verified, current problems in Zernio's own
platform integrations** — most relevantly for this project's target
platforms: Facebook Graph API analytics calls are "completely broken" after
Meta deprecated v18.0 (production 400 errors on insight metrics), and X/
Twitter analytics hits `UsageCapExceeded` 429s in production. This is a
materially more concrete and more serious finding than the original
"unverified capability claim" caveat — it's dated evidence of two of this
project's four target platforms having broken analytics on Zernio's side
as of Feb 2026, not just an untested claim. See Open dependencies.

## Pipeline architecture — the full loop

```
Signal scan (every 1–2h) ──────────────────────────────────┐
                                                              ▼
                                                        Strategist (daily)
                                                              │
                                                    Platform Writer (per platform)
                                                              │
                                                      Guardrail Critic
                                                        │           │
                                                   revise ↺       reject → logged, stops
                                                        │
                                                    Publish (Zernio POST /v1/posts)
                                                              │
                                      ┌───────────────────────┴──────────────────────┐
                                      ▼                                              ▼
                          webhook: published/failed                    Performance sync (daily)
                                                                                      │
                                                                          Retro (weekly) → proposes
                                                                          social_brand_profile edits
                                                                          as a pending diff, not
                                                                          auto-applied

Zernio inbox webhook (real-time) → Engagement draft → same Guardrail Critic → Zernio reply
```

**State, not just steps.** `social_posts.status` is a small state machine:
`signal_gathered → briefed → drafted → guardrail_pending → approved →
publishing → published` (or `rejected` / `publish_failed` at any gate).
Each tick's actual job is "find rows stuck in an actionable status, advance
them one step" — not "run everything from scratch." This is what makes a
mid-publish crash safe: the row sits at `publishing`, and the Zernio
`published`/`failed` webhook (or the next tick, if the webhook itself is
missed) resolves it, rather than risking a duplicate post. Same discipline
this repo already applied in the merch-shop ADR's `fulfillment_failed` +
manual-retry pattern — a failure is recorded explicitly, never silently
retried in a way that could double-act.

**Failure isolation per step**, not all-or-nothing: every step wrapped
independently, logged either way via `logCronRun`-equivalent, exactly like
`gsc-diagnostics` isolating its 3 property-format attempts. One platform's
Writer call failing doesn't block the others; one bad RSS feed doesn't
block the Strategist from using GSC data alone that day.

## Memory layer — six layers, all real, all needed now (multi-tenant confirmed)

1. **Tenant** (`social_accounts`) — one row per managed brand, holding its
   `zernio_profile_id`. Everything below is `account_id`-scoped from day one.
2. **Run/state** (`social_runs`) — per-tick log, same shape as `cron_runs`.
3. **Signals** (`social_signals`) — scored RSS/GSC deltas feeding the
   Strategist, `account_id`-scoped.
4. **Content/brand** (`social_posts`, `social_brand_profile`) — what's been
   said, in what voice; `social_post_metrics` holds the Zernio-synced
   performance numbers per post.
5. **Audience** (`social_inbox_items`) — DMs/comments from the Zernio inbox
   webhook, with drafted reply, guardrail verdict, sent status. PII handling
   note: don't log raw message content indefinitely without a stated
   retention window — this is real personal data from strangers, not the
   operator's own content.
6. **Operator** — not a separate table; `approved_by`/`rejection_reason`/
   edited-vs-original columns on `social_posts` and `social_inbox_items`.
   The weekly Retro reads a sample of recent rejections and folds "the
   operator tends to reject X" into the next brief — this is the concrete
   mechanism for "the system learns your taste," not a vague claim.

Deferred, deliberately: semantic/vector memory (`pgvector` is available,
unused) — no data volume yet to justify it; a multi-tenant *onboarding UI*
beyond the schema (the actual "connect a new tenant" flow) — real, separate
work, sized honestly as not-yet-scoped.

## Communication protocol / UI-UX

Grounded in two patterns **already built and running in this repo**, not
invented for this research:

- **Approval queue** — `/admin/social/queue`, directly modeled on
  [moderation-board.tsx](../../app/admin/moderation/moderation-board.tsx):
  a client component fetching `/api/admin/social/queue`, rendering one Card
  per pending item (platform, draft copy, guardrail verdict + reasoning,
  disclosure flag) with inline action buttons (`Approve & Publish` /
  `Edit` / `Reject`) that `PATCH` status and immediately reload — the exact
  shape already used for reply moderation. Every action here writes the
  operator-memory columns in layer 6 above for free, since it's the same
  PATCH-and-log pattern already proven.
- **Performance dashboard** — `/admin/social/performance`, directly modeled
  on [seo-board.tsx](../../app/admin/seo/seo-board.tsx): stat cards (views,
  CTR, engagement, traffic — the four goal metrics) plus per-platform,
  per-post tables, fetched from one admin API route that reads
  `social_post_metrics`. No new component library, no new design pattern.
- **Account connection** — `/admin/social/accounts`: list of connected
  Zernio profiles/accounts per tenant with a "Connect new account" button
  that redirects to Zernio's `GET /v1/connect/{platform}` `authUrl` —
  thinner than the other two pages since Zernio owns the actual OAuth UI.
- **Notification** — a Resend email digest (already wired,
  [lib/email.ts](../../lib/email.ts)) when the queue has pending items or
  the watchdog (below) detects staleness, so the operator isn't polling a
  page to know something needs attention.
- **Ad-hoc query** — deliberately not a fourth page. Because every signal,
  draft, and metric lands in real Supabase tables, "query per data pulled,
  ongoing investigations" is already satisfied the moment the tables exist
  — ask a live Claude session a question, it queries the rows. A dashboard
  is a convenience for glanceable numbers, not a prerequisite for querying.

No new UI framework, component library, or design system is needed — this
project already has the exact two component shapes (action queue,
read-only report board) this feature needs, built and proven.

## Guardrails

**Content-draft dimensions**: factual/claim accuracy (same bar as
articles); platform policy fit (checked per-platform, not generically);
**FTC affiliate disclosure — hard gate, not a score**; brand voice/tone fit
against `social_brand_profile`; spam/bot-pattern risk (repetitive phrasing,
engagement-bait, over-uniform cadence — a distinct check from "is the copy
good," since good copy can still trip platform spam detection); sensitive-
topic escalation (health claims, financial-advice framing, political/
current-event adjacency).

**Engagement (reply) dimensions — stricter, since it's real-time and
public**: never commit the business to pricing/terms without operator
review; de-escalate hostile threads, never argue; PII handling on inbound
content (see memory layer 5); disclosure that a reply is automated, per
growing platform/jurisdiction expectation.

**Contract**, mirroring `CriticReview`'s proven shape:

```ts
type SocialGuardrailReview = {
  decision: "publish" | "revise" | "reject";
  platform: "instagram" | "facebook" | "linkedin" | "x";
  checks: {
    factualAccuracy: 1|2|3|4|5;
    platformPolicyFit: 1|2|3|4|5;
    brandVoiceFit: 1|2|3|4|5;
    spamPatternRisk: 1|2|3|4|5; // 5 = looks nothing like bot spam
  };
  disclosureRequired: boolean;
  disclosurePresent: boolean;
  sensitiveTopicFlags: string[];
  reasoning: string;
};
```

**Decision rules, hard-coded, not left to model judgment**:
`disclosureRequired && !disclosurePresent` → automatic `reject`, no score
can override it. `factualAccuracy < 4 || platformPolicyFit < 4` → `reject`.
Otherwise, any dimension at 3 → `revise`. Parse failure → default `reject`,
same discipline as `evaluateProductFit` in `lib/market-intelligence.ts`.

## Best practices / how the workflow gets crafted

- **One writer prompt per platform**, not one generic prompt with a
  platform parameter — IG/LinkedIn/X conventions differ enough that native
  copy requires native prompts.
- **A freshness re-check immediately before publish**, separate from the
  draft-time guardrail — catches the gap between "drafted this morning,
  scheduled for this afternoon" and something making the post look bad by
  publish time.
- **Graduated autonomy, not full automation from day one.** This repo
  already set a precedent for exactly this kind of threshold (the reader-
  retention research's "~50–150 subscribers or 4–8 weeks" graduation bar).
  Same idea here: manual approval required for every post through an
  initial trial period; auto-publish for guardrail-approved posts becomes
  the default only once your actual approvals have been checked against the
  guardrail's calls for a while. Unreviewed auto-publish from week one is
  the single highest-risk design choice available here — don't take it by
  default.
- **Log which prompt/model version produced each post** (`pipeline_version`
  on `social_posts`) so a later prompt tweak's effect on quality is
  traceable, not guessed at.

## Prompt tooling — worth using, narrowly

Two free/cheap tools, used differently, not adopted as new runtime
dependencies:

- **Anthropic's Console Prompt Generator/Improver** (free) — a drafting aid
  for the ~7–8 new prompts this system needs (Strategist, one Platform
  Writer per platform, Guardrail Critic, Engagement draft, Retro). Used
  once during authoring; produces no artifact that ships in the codebase
  beyond the prompt text itself.
- **Promptfoo** (open source) — runs a test dataset against multiple
  prompts and multiple models, scores results, produces a comparison
  table. Worth using specifically for the **Guardrail Critic** prompt,
  since the cost model deliberately assigns a cheap model to the one step
  carrying a hard, non-negotiable disclosure gate — "default to reject on
  parse failure" protects against catastrophic failure, but says nothing
  about whether a given cheap model is actually *good* at catching a
  missing disclosure or a spam pattern. Test 2–3 candidate cheap models
  against a small labeled set (drafts that should pass vs. should be
  caught) before committing to which one becomes `OPENROUTER_SOCIAL_MODEL`'s
  cheap tier — add this as an explicit task inside **Phase 2** of the build
  plan below, before the guardrail step is considered finished, not a
  separate phase.
- **DSPy** (programmatic prompt optimization) — skipped for now. It needs
  well-defined metrics and real data to optimize against; there's no
  post/guardrail-verdict history yet. Same "earn the complexity" reasoning
  as semantic memory and every other deferred item in this doc — revisit
  once real run history exists.

## Market intelligence

Two distinct pipelines, not one:

- **Prospective** (what to post about): RSS-harvest signals + GSC query
  deltas, already connected in this repo, scored by a cheap model into
  `social_signals` every tick. No free "what's trending on social" API
  exists — same permanent gap `lib/trend-signals.ts` already documents for
  product trends. Competitor tracking is free/manual-only by explicit
  decision (RSS + watchlists) — thin by design, not a gap to silently work
  around.
- **Retrospective** (how existing posts did): Zernio analytics API, synced
  daily into `social_post_metrics`; GA4 (already wired) supplies referral
  traffic attributed by UTM per post. The weekly Retro reads both and
  becomes an input to the next Strategist brief — the actual learning loop.

**Metrics**: Views → Zernio reach/impressions. CTR → Zernio link-clicks +
GA4 UTM. Interaction → Zernio likes/comments/shares. Traffic → GA4 referral
sessions by platform. Cost efficiency → OpenRouter + Zernio spend per post
per 1000 impressions, summed from `social_runs`/`social_posts` fields.

## Cost model

- **OpenRouter** (~$0.017–$0.15/M tokens for small models, up to mid-teens
  for frontier[^6]): cheap model for the high-frequency signal-scan and
  guardrail-critic steps; mid-tier for the daily Strategist/Writer calls;
  the existing article-tier model only for the weekly Retro. Keeps daily
  spend in the low tens of cents at a 12–24 tick/day cadence.
- **Zernio**: 2 accounts free, then $1–6/account/month[^7] — a few
  dollars/month for phugialy.com's own accounts, not a per-day cost. Small,
  but real and separate from the token budget — needs the same explicit
  sign-off as the images-funding conversation, not a silent assumption.
- **No rate-limit-driven cost risk** — confirmed via Zernio's published
  limits[^10]; this system's volume is nowhere near any ceiling.

## Operational reliability — keeping it running for weeks/months

- **Silent trigger death**: GitHub Actions can fail or get disabled
  unnoticed. A daily `social-watchdog` step (same shape as `site-health`)
  checks staleness against `social_runs` and — a real gap this project has
  everywhere today, worth fixing here — **actually emails via Resend on
  failure**, since every existing cron in this repo only logs, never alerts.
- **Idempotency**: Zernio's webhook event IDs (`X-Zernio-Event-Id`) are a
  ready-made dedup key for processing published/failed/inbox events exactly
  once, on top of the `social_posts.status` state machine already
  preventing duplicate publish attempts.
- **Runaway cost**: hard caps mirroring `market-intelligence.ts`'s existing
  `MAX_CANDIDATES_PER_RUN` pattern — max revision passes (2, like articles),
  max posts drafted/day, daily OpenRouter spend summed into the watchdog's
  own report.
- **Credential expiry vs. "nothing to post"**: Zernio's `account.disconnected`
  webhook makes this a typed, detectable event, not a silent stop.
- **Slow drift**: the weekly Retro's brand-profile edits land as a pending
  diff for operator approval, never auto-applied — the self-model gets the
  same guardrail treatment as everything else the system produces.

## Potential issues, concretely

- A bad post is far harder to walk back than a bad article — screenshots
  outlive deletions. This is why the guardrail bar and graduated-autonomy
  period matter more here than in the article pipeline.
- Platform suspension is existential, not degraded-quality — a ToS/spam
  violation can end the whole channel, which is why spam-pattern-risk is
  its own guardrail dimension, not folded into "brand voice."
- Credential compromise (Zernio API key or a tenant's OAuth token) lets an
  attacker post as the brand across every connected platform at once —
  same class of risk as this project's existing unresolved key-rotation gap.
- Silent, repeated disclosure failures are a compounding FTC compliance
  problem, not a one-off mistake — why disclosure is a hard gate on every
  single post, not a spot-check.
- Engagement replies are the highest-variance risk in the system — reactive,
  public, real-time, to content this project doesn't control. Warrants the
  longest manual-review period before any auto-reply is trusted.

## Build readiness — can we build everything, including UI/UX?

| Component | Status | Notes |
|---|---|---|
| Trigger/cron | **Ready** | Proven pattern (`auto_blog.yml`), just needs a new workflow file + route |
| Zernio: connect accounts (multi-tenant) | **Ready** | `POST /v1/profiles`, `GET /v1/connect/{platform}`, `account.connected` webhook — concrete endpoints confirmed |
| Zernio: publish | **Ready** | Field-level schema confirmed via [zernio-dev/openapi-specs](https://github.com/zernio-dev/openapi-specs) — e.g. `linkedin.yaml`'s `POST /rest/posts` with full request/response shape, including organization-authored (company-page) posts. Use this repo directly as the API reference, and `zernio-dev/zernio-node`'s official SDK instead of a hand-rolled client. |
| Zernio: webhooks | **Ready** | Event types, signing, retry semantics all confirmed |
| Zernio: analytics | **Ready, with a known caveat** | Schema is documented, but `openapi-specs`' own verified discrepancy report shows Facebook analytics currently broken (post-v18.0-deprecation 400 errors) and X analytics hitting usage-cap 429s in production, as of Feb 2026 — this is Zernio's own integration issue, not something this project's design can fix. Build the performance-sync step to tolerate a per-platform analytics failure gracefully (same per-step isolation pattern as everything else here), and expect Facebook/X metrics to be the least reliable of the four platforms at launch. |
| Pipeline/guardrail logic | **Ready** | Contract + hard decision rules specified above, directly extends a pattern already in production |
| Memory schema | **Ready at table level** | Six tables named with their columns' purpose; column-level SQL migration is normal implementation work (same as any other feature here), not a research gap |
| UI/UX | **Ready** | Reuses two existing, working component patterns exactly (`moderation-board.tsx`, `seo-board.tsx`) — no new design system or pattern needs inventing |
| Market intelligence signals | **Ready** | Reuses existing RSS-harvest + GSC integrations, no new data source |
| Cost governance | **Ready** | Model tiering + hard caps specified |
| Reliability/watchdog | **Ready** | Pattern specified, needs the Resend-alert gap (present everywhere in this project, not unique to this feature) closed |

**Two things to confirm at implementation time, not before starting** (down
from three, now that `openapi-specs` and `latewiz` close the schema and
LinkedIn-company-page questions): a live test of LinkedIn company-page
posting through Zernio's actual API (the underlying LinkedIn spec supports
it; confirming Zernio's own implementation is a quick real test, not
open design work); and this project's standing credential-rotation gap,
which should close before Zernio's own key joins it. **One new, more
concrete risk replaces the old "analytics schema unverified" item**:
Facebook and X analytics are verified-broken on Zernio's own integration as
of Feb 2026 (see Prior art above) — design the performance-sync step
assuming Instagram/LinkedIn metrics are reliable and Facebook/X metrics may
intermittently fail, rather than assuming uniform reliability across all
four platforms.

**None of these block starting the build** — they're implementation-time
lookups (read one API spec, test one platform's posting), not open design
questions. The architecture, data model, guardrails, and UI are specified
enough to start.

## Scoping — this is a standalone application, hosted here

Multi-tenant decision engine + state orchestrator + six-layer memory +
admin UI suite is a complete, independent product, not a feature of
phugialy.com's blog. Compute stays in this repo (Decision 1's reasoning
still holds), but the product boundary should be kept clean from day one —
`/admin/social/*` route namespace, `social_*` table prefix, no cross-imports
from article/affiliate code beyond genuinely shared infra
(`lib/openrouter.ts`, `admin-auth.ts`, the Supabase client). This is what
keeps "split into its own repo later" a cheap, reversible option instead of
an expensive untangling, consistent with this doc's reversibility standard
everywhere else.

## External review — weaknesses and core principles, assessed

A second-pass review (not this project's own) raised five weaknesses and
three "protect these no matter what changes" principles. Recorded with an
honest assessment of each, since most are right and one changes the design.

**Weaknesses:**

1. **Intelligence loop weaker than execution loop** — valid, and already
   named in this doc (no free trends API exists, competitor tracking is
   thin by design). Sharper framing worth keeping: *a reliable machine that
   occasionally makes mediocre decisions because its inputs are limited*.
   One concrete, cheap mitigation not yet in the design: a manual signal-
   injection path — an operator who personally knows something worth
   posting about shouldn't have to wait for RSS/GSC to surface it. Add a
   `social_signals.source = "operator"` row type the Strategist reads
   exactly like any other signal.
2. **Learning loop is rules + recent history, not deep adaptation** — valid,
   matches this doc's deliberate deferral of semantic memory. The concrete
   examples given ("have we made this point before," "which topics fatigue")
   are better graduation criteria than "enough data volume" — use them
   directly as the trigger: build `pgvector` recall when repetition or
   topic-fatigue complaints start showing up in operator rejections, not on
   a fixed post-count threshold.
3. **Zernio is a major dependency/failure domain** — valid, and already the
   most concretely-addressed weakness in this doc (the verified Feb 2026
   Facebook/X analytics breakage, per-step failure isolation, typed
   `account.disconnected`/`post.failed` webhook events). No new design
   change needed — the "assume the social API layer can be partially wrong"
   framing is exactly what's already built in.
4. **Human approval becomes the bottleneck at scale** — the one genuinely
   new point. Graduated autonomy (time-based: review everything, then
   trust the guardrail once it's proven) doesn't by itself solve the
   *volume* problem once multiple tenants/platforms/drafts/replies exist.
   Design response: make autonomy **confidence-tiered, not binary** — high-
   confidence/low-risk categories (e.g. a routine scheduled post with a
   clean guardrail pass, no disclosure flag, no sensitive-topic flag)
   fast-track sooner than ambiguous ones, and the review surface becomes a
   ranked daily digest rather than a per-item interrupt. This is an
   extension of the existing guardrail contract, not a new subsystem — see
   the Decision Engine expansion below.
5. **Engagement is harder than publishing** — already this doc's own stated
   position, restated back nearly verbatim ("the highest-variance risk in
   the whole system"). Confirms alignment. One addition: make some
   engagement categories a **permanent** human-review requirement rather
   than something that graduates out — pricing requests, complaints, legal-
   adjacent topics stay gated regardless of how long the system's been
   running, distinct from routine "thanks!"-tier replies which can graduate
   normally.

**Core principles — all three already the design, one reframing worth
adopting:**

1. **Persistent state/memory is the real product, not the model.** Exactly
   right, and exactly what the six-layer memory section already argues —
   models are swappable (`OPENROUTER_SOCIAL_MODEL` is an env var), the
   state in `social_accounts`/`social_runs`/`social_signals`/`social_posts`/
   `social_brand_profile`/`social_inbox_items` is what makes "yesterday
   affects today" true. Worth stating as an explicit protected principle at
   the top of this doc, not just implied by the schema.
2. **A decision/guardrail engine, generalized beyond content quality.** The
   `SocialGuardrailReview` contract specified earlier checks factual
   accuracy, platform policy, brand voice, spam risk, and disclosure — this
   review's list (budget permission, brand permission, platform permission,
   repetition, sensitive topics, factual confidence, human escalation,
   allowable actions) is a real, worthwhile expansion. Concretely: add
   `budgetOk: boolean` (checked against the daily OpenRouter/Zernio spend
   cap from the Cost model section), `repetitionRisk: 1-5` (checked against
   recent `social_posts` rows, feeding weakness #2's fatigue detection), and
   `escalate: boolean` (distinct from `reject` — routes to mandatory human
   review regardless of confidence tier, for weakness #5's permanent-
   review categories) onto the existing contract, rather than building a
   separate engine.
3. **State orchestration, reframed**: "system state surfaces what needs
   attention, a scoped worker runs, state transitions" instead of "agent
   decides what to do." This is the same `social_posts.status` state
   machine already designed (`signal_gathered → briefed → drafted →
   guardrail_pending → approved → publishing → published`), but the
   reframing is sharper than how this doc first stated it — adopt this
   phrasing going forward: **the orchestrator's job every tick is "find
   rows stuck in an actionable state," never "decide what to do from
   scratch."**

## Deployment plan — personal app now, cheap to graduate later

**Phase 1 (now): ride entirely on this project's existing, proven
deployment ritual.** Same Vercel project, same Supabase project, same
`commit → push → vercel --prod --yes → alias both domains` flow this
project already uses, same migration discipline (SQL handed over, run
manually, verified via REST before dependent code ships). Zero new hosting
service, zero new infrastructure to operate — consistent with every
"rejected: new standing service" call already made in this doc.

New pieces this feature adds to that existing flow, in dependency order:

1. Supabase migrations for the `social_*` tables (schema first, same
   discipline as every migration in `supabase/migrations/`).
2. New env vars: `ZERNIO_API_KEY`, `ZERNIO_WEBHOOK_SECRET` (for HMAC
   verification), `OPENROUTER_SOCIAL_MODEL` — reuse the existing
   `CRON_SECRET` for the new cron routes rather than minting another one.
3. New GitHub Actions workflow file for the 1–2h trigger (new file, no new
   repo secret beyond what `CRON_SECRET` already covers).
4. New routes: `/api/cron/social-*`, `/api/webhooks/zernio`,
   `/admin/social/*` — deployed together, but the webhook can't be
   *registered* with Zernio (`POST /v1/webhooks/settings`) until the route
   is live at a real production URL — that registration step happens
   **after** this deploy, not before, same "one-time external side effect,
   done manually once, post-deploy" shape as this project's existing GSC
   property configuration.
5. Manual end-to-end test against one real (or Zernio-provided test)
   account before the GitHub Actions trigger is actually enabled — confirm
   the whole state machine advances correctly before it starts running
   unattended.

**Preview-deploy safety — a concrete risk worth naming now, not discovering
later**: Vercel preview deployments (every branch/PR) can see the same env
vars as production unless scoped separately. A preview build must not be
able to publish to real, live social accounts. Mitigation: scope
`ZERNIO_API_KEY` to the Production environment only in Vercel's env var
settings (Preview gets none, so the feature safely no-ops), or use a
dedicated test-only Zernio account for Preview if Zernio offers one —
**confirm which at implementation time**, don't assume.

## Modularity — what to do now so a later split is cheap, not a rewrite

The user's own framing is right: this starts as a personal app but needs to
stay cheaply separable if it grows into something bigger (the Scoping
section above already established this is architecturally a standalone
product). Concretely, staying inside phugialy-profile for Phase 1 doesn't
conflict with that, as long as internal boundaries are kept clean from the
first commit, not retrofitted later:

- **Code boundary — ports and adapters, not just a folder.** A directory
  under `lib/` that still directly calls `createSupabaseAdminClient()` and
  reads `process.env.X` inline is tidy, but it isn't portable — copy it
  into a new repo and it won't run until every one of those calls gets
  rewritten. The core logic (pipeline steps, guardrail/decision engine,
  state machine) should depend only on interfaces it defines itself, never
  on this repo's concrete modules:

  ```ts
  interface LLM {
    generateText(messages: Message[], opts?: { model?: string }): Promise<{ content: string; usage?: Usage }>;
  }
  interface Store {
    get<T>(collection: string, id: string): Promise<T | null>;
    list<T>(collection: string, query: Query): Promise<T[]>;
    insert<T>(collection: string, row: T): Promise<T>;
    update<T>(collection: string, id: string, patch: Partial<T>): Promise<T>;
  }
  interface Platform {
    createPost(input: PostInput): Promise<PostResult>;
    getAnalytics(postId: string): Promise<Analytics>;
    listInbox(accountId: string): Promise<InboxItem[]>;
    reply(inboxItemId: string, text: string): Promise<void>;
  }
  interface AuthGate {
    isAuthorized(request: Request): boolean;
  }
  ```

  `lib/openrouter.ts`'s `generateOpenRouterText(messages) => result` is
  already shaped almost exactly like `LLM` — no Next.js/Vercel leakage, close
  to portable as-is. The actual leak is `Store`:
  `market-intelligence.ts`'s `discoverTrendingByCategory` calls Supabase
  directly, inline, mixed into business logic — that's the pattern to avoid
  repeating here. Concrete implementations (a Supabase-backed `Store`, an
  OpenRouter-backed `LLM`, a Zernio-backed `Platform`) live in thin "host
  glue" files under `app/`, instantiated once and passed into the core —
  plain function parameters, not a DI framework or plugin registry; that
  heavier version would be over-engineering the same idea this doc has
  rejected everywhere else. A bug that lives entirely behind these
  interfaces is provably not a Supabase, Vercel, or portfolio-site problem
  — the interface boundary is the evidence, which is the actual point of
  doing this before it's forced by an incident.
- **Directory boundary**: not `lib/social/` nested inside this repo's
  existing `lib/`, but a genuine top-level `/social-agent/` directory — its
  own `pipeline/`, `ports.ts`, prompt templates, migrations folder. Only
  thin wiring files under `app/` (routes, the concrete adapter instances)
  ever reference it. This is what makes "our own code directory" true in
  the way that matters: visually and structurally unambiguous during a
  `git rm -r`, a copy into a new repo, or a debugging session asking "did
  this break the portfolio site or not" — a one-directional dependency
  from thin glue into a self-contained core is what makes later extraction
  a copy, not a surgery.
- **Route boundary**: everything under `/admin/social/*`,
  `/api/cron/social-*`, `/api/webhooks/zernio` — sharing only the base
  admin shell/auth, no component coupling with article/affiliate features.
- **Data boundary**: `social_*` table prefix, service-role-only access —
  already the plan, matches every other table in this project.
- **Config boundary**: every social-specific env var documented as its own
  block in `.env.example`, same convention already used for the affiliate
  and scheduling features.

### Graduation path, in order of actual cost — don't skip ahead

1. **Stay in this repo** (current plan) — right for a personal app with one
   tenant (phugialy.com's own accounts).
2. **Same repo, separate Vercel project** (pnpm workspace, `apps/portfolio`
   + `apps/social-manager`, sharing a `packages/shared`) — worth it once
   the social admin UI's build/deploy activity starts genuinely colliding
   with the portfolio site's own deploys (a bug in one shouldn't be able to
   break the other's build). Still one repo, one Supabase project.
3. **Separate repo, shared Supabase project** — full deploy/CI independence,
   no data migration needed since the database doesn't move. The natural
   step once there's a second real tenant beyond phugialy.com itself.
4. **Separate repo, separate Supabase project (and likely separate
   billing)** — full isolation. Appropriate once there are real external,
   paying tenants and the associated ToS/data-residency questions become
   real, not before. This is "it's now actually a company's product," not
   "phugialy.com's LinkedIn got better."

**Don't jump ahead of where the evidence is** — same principle already
applied throughout this doc (semantic memory, multi-tenant onboarding UI,
n8n/LangGraph). Tier 1 is correct today. Move to tier 2 only when tier 1's
constraints are actually felt, not preemptively.

## Phased build plan

`research-features` stops here by design — starting Phase 0 is a
`dev-features` call, a separate, explicit next step, not something this
document does itself. Recommended granularity: **one `dev-features` run
per phase below**, not one run for the whole system — each phase is
right-sized to get its own Plan Mode gate, build, validation, and push.

The one real external provisioning gate is Zernio account signup/OAuth
connection — it needs a human to complete real platform OAuth and can't be
faked. Because the core pipeline only ever talks to `Platform` through the
port interface (Modularity section above), everything except actual
publishing and actual inbox events can be built and validated against a
stub `Platform` *before* that signup happens — turning one blocking
dependency into a narrow, late-binding one instead of a critical-path
blocker for the whole build. Phases 1 and 2 below are meant to run in
parallel for exactly this reason.

| Phase | Delivers | External provisioning needed | Can start now? |
|---|---|---|---|
| **0 — Foundation** | `/social-agent/` directory, `ports.ts` interfaces, Supabase-backed `Store` adapter, OpenRouter-backed `LLM` adapter (reuses existing key), empty `social_*` migrations | None | Yes |
| **1 — Zernio provisioning** *(parallel track)* | Sign up, get API key, connect one real test account, confirm LinkedIn company-page posting live | Zernio account + real platform OAuth (human-required) | Yes — parallel with Phase 2, not before it |
| **2 — Core pipeline (stubbed)** | Signal scan → Strategist → Writer → Guardrail Critic, full state machine, against a fake `Platform` that logs instead of posting | None | Yes, parallel with Phase 1 |
| **3 — Real publish** | Swap the stub `Platform` for the real Zernio-backed one, register the webhook (needs a live deployed URL — one-time manual step post-deploy) | Requires Phase 1 done + a deploy | After 1 + 2 |
| **4 — Approval queue UI** | `/admin/social/queue`, ported/adapted from `latewiz`, wired to the state machine and guardrail verdicts | None | Parallel with 2/3 |
| **5 — Engagement loop** | Inbox webhook → draft → guardrail → reply, permanent-review categories enforced | Needs Phase 3's webhook infra live | After 3 |
| **6 — Performance sync + dashboard** | `social_post_metrics`, `/admin/social/performance` (ported from `seo-board.tsx`) | Needs real published posts to sync against | After 3 |
| **7 — Reliability** | Watchdog cron with real Resend alerting, idempotency via webhook event IDs, cost caps | None (Resend already configured) | Parallel with 3–6 |
| **8 — Intelligence tuning** | Manual signal-injection path, confidence-tiered autonomy, graduation-triggered semantic memory | None — data-driven, ongoing | After enough real run history exists |
| **9 — Modularity graduation** *(conditional)* | Move to tier 2/3/4 from the Modularity graduation path | Only if a real trigger is hit (build collisions, second tenant, paying tenants) | Not planned, watched for |

## Implementation status

Phases 0, 2, 4, and 7 of the Phased build plan are built, in this
repo, right now — everything that doesn't require a real Zernio account.
Built by autonomous agent runs (self-directed, no interactive gate, each
ending in a detailed report per the `feature-builder` agent's design),
cross-checked directly rather than only trusting the self-reports: full
repo typecheck/lint clean, **72/72 unit tests passing**.

**What exists:**
- `/social-agent/ports.ts` — the `LLM`/`Store`/`Platform`/`AuthGate`
  interfaces, plus `README.md` explaining the boundary rule.
- `app/social-agent-adapters/` — `store.ts` (Supabase-backed `Store`, now
  with a real camelCase↔snake_case translation layer — see below),
  `llm.ts` (OpenRouter-backed `LLM`), `auth-gate.ts`, and a stub
  `platform.ts` (logs instead of calling real Zernio).
- `social-agent/pipeline/` — signal scan (with the manual operator-signal
  injection path), strategist, four per-platform writers, the guardrail
  decision engine (`SocialGuardrailReview` with hard-coded disclosure/
  budget/escalation rules), and the state machine driver — all unit-tested
  against in-memory mocks, none of it touching a real database yet.
- `social-agent/reliability/watchdog.ts` — staleness detection, cost-cap
  checking, credential-vs-generic-failure typing.
- `app/admin/social/queue/` + `app/api/admin/social/queue/` — the approval
  queue UI, ported from `moderation-board.tsx`'s pattern, with an inline
  edit-before-approve flow.
- `app/api/cron/social-pipeline/route.ts` + `.github/workflows/social-pipeline.yml`
  — the actual GitHub Actions trigger (`0 */2 * * *`, every 2 hours) wiring
  the pipeline together end to end, against the stub `Platform`.
- `app/api/cron/social-watchdog/route.ts` + a `vercel.json` entry — the
  daily watchdog, native Vercel cron (same as every other daily job here),
  since only the 1–2h pipeline tick needed the GitHub Actions escape hatch.
- `supabase/migrations/0017_social_agent_foundation.sql` — all seven
  tables. **Applied and verified live**: every table/column confirmed
  queryable, and RLS confirmed actually enforcing (a real anon-key INSERT
  attempt was rejected with Postgres's own `42501` error — a plain `SELECT`
  check against an empty table can't distinguish "RLS blocking" from
  "nothing to return either way," so that's not what this claim rests on).
- `vitest.config.ts` — a genuine, separately-useful fix found along the
  way: this repo had no Vitest config, so `@/*` path aliases didn't
  resolve under `vitest run` and Playwright's `tests/e2e/**` specs leaked
  into it, causing spurious failures. Three independent agent runs each
  flagged the second symptom before the root cause was found and fixed.

**A real cross-phase bug found and fixed, not just self-reported clean:**
the pipeline (camelCase: `draftCopy`, `guardrailVerdict`, `scheduledAt`,
`score`, `voice`, `toneRules`, ...) and the migration (snake_case:
`draft_text`, `guardrail_review`, `scheduled_for`, `relevance_score`,
`voice_description`, `tone_guidelines`, ...) were built by different
concurrent agents and didn't match — several fields weren't even the same
root word, not just casing, and a couple of fields (`draft_hashtags`,
`draft_ready_for_review`, `revision_count`, `banned_topics`) were missing
from the migration entirely. Fixed at the correct layer per the ports-and-
adapters design: `store.ts` now does real translation (explicit aliases for
non-mechanical renames, generic case conversion for the rest, applied to
insert/update/query/orderBy — never recursing into jsonb column contents,
which don't need it), and the migration gained the handful of genuinely
missing columns. Now covered by `app/social-agent-adapters/store.test.ts`,
which didn't exist before this was found.

**Manual follow-ups, status as of the latest session**:
1. ~~Apply the migration~~ — done, verified live (see above).
2. Add `CRON_SECRET` as a GitHub Actions repository secret (Settings →
   Secrets and variables → Actions), same value as the Vercel env var — the
   workflow file fails loudly with an explicit error if this is missing,
   rather than silently no-op'ing. **Status unconfirmed** — not verified
   either way this session; check before relying on the scheduled trigger.
3. `OPENROUTER_API_KEY` is not set in local `.env.local` — a real manual
   test tick confirmed everything else works end-to-end (operator-signal
   injection, post creation, state advancement, clean per-step error
   isolation) but the Writer step needs this key to actually produce a
   draft. Blocking a full local test tick; not required for deployment if
   Vercel's own env already has it configured (unconfirmed).
4. Nothing has been pushed or deployed. One commit exists locally
   (foundation, pipeline, admin UI, Zernio adapter, guardrail-gate fix);
   the MCP server, the watchdog field-name bug fix, and the MCP resources
   are built and verified but not yet committed. Push and `vercel --prod`
   deploy are both still pending, by choice, not by blocker.

**Update — Zernio provisioning happened, and the real `Platform` adapter is
built.** A real Zernio account now exists with two connected, verified-live
accounts (Facebook Page "Hippo On Tech", Instagram Business
@hippo_blog_phugialy, confirmed directly against Zernio's own API, not
just trusted). `app/social-agent-adapters/zernio-platform.ts` implements
`createPost`/`getAnalytics`/`listInbox`/`reply` against real endpoints,
each shape checked directly against `zernio-dev/zernio-node`'s own
generated SDK types — cited in-code, not guessed.

**A real gate bug was found and fixed alongside it, not just the adapter
itself**: `state-machine.ts`'s `guardrail_pending` case used to auto-advance
a "publish" verdict straight to `"approved"` with no human ever seeing it —
which, once a real `Platform` existed, would have auto-published to a real
account on the very next tick with zero review. Fixed: a "publish" verdict
now stays at `guardrail_pending`, visible in the admin queue, until an
explicit human Approve click moves it to `approved` — the only path that
reaches `platform.createPost`. `createPost` itself additionally never sends
`publishNow: true` under any input (typed as `publishNow?: false`, not just
avoided by convention) — it schedules or drafts, never force-publishes.

**One real, honestly-flagged limitation**: `Platform.reply`'s fixed
signature (`inboxItemId`, `text`) carries no `accountId`, but Zernio's send-
message endpoint requires one to know which connected account is replying.
Worked around with an extra unfiltered conversation-list call to resolve it
— functional, but not guaranteed to find the row on the first page for a
high-volume inbox. Worth widening the `Platform` port's `reply` signature
in a later pass; left alone here since `ports.ts` was out of scope for this
change.

**Still not done, deliberately**: no real-world smoke test against the live
Zernio account was performed (every test mocks `fetch`, several throwing if
a real call is ever attempted) — the first real post only happens once a
human approves a guardrail-passed draft through the admin queue. 86/86
tests passing, clean typecheck/lint, independently re-verified.

**Update — MCP resources added alongside the existing 9 tools.** The MCP
server (`app/api/mcp/social/route.ts`) now also exposes three MCP
*resources* — readable context documents, distinct from the callable
tools — per `docs/decisions/social-mcp-resources.md`:
`social://brand-profile` (same data as `get_brand_profile`, reframed as a
document), `social://guardrail-rules` (a prose explanation of
`guardrail.ts`'s `decideGuardrailOutcome`, with live numeric thresholds
interpolated from `get_guardrail_config`'s own source, never hand-copied),
and `social://operating-scope` (the verified boundary of what Hippo-Assist
can/cannot do through this server — brand-profile writes are immediate with
no approval gate, `approve_post` is the one action that can trigger a real
publish to the live Facebook/Instagram accounts on the pipeline's next
tick, `inject_signal` only ever proposes a topic, and guardrail numeric
thresholds have no write path on this server by design). Content-building
logic lives in `social-agent/mcp/resources.ts` (portable, Store-port-only);
133/133 tests passing (118 pre-existing + 15 new), clean typecheck/lint.
Semantic/vector search over post/rejection history remains explicitly
deferred, not attempted.

## Rejected alternatives

- Vercel Cron alone — daily-only on this repo's current config.
- n8n / LangGraph / Temporal — solve branching complexity this project
  doesn't have yet, at the cost of a new standing service.
- Direct per-platform APIs (Meta/LinkedIn/X, built and held here) — recreates
  the LinkedIn Partner Program and X pay-per-use friction Zernio exists to
  absorb, and now also ignores real, MIT-licensed, actively-maintained
  Zernio-based prior art (`latewiz`, `unified-inbox`, `zernio-node`) that
  would otherwise need reinventing from scratch.
- Ayrshare — same capability category as Zernio at ~25–150x the price.
- Single do-everything agent per tick — contradicts the explicit guardrails
  ask, and this repo has a documented production incident showing why.
- Single-tenant memory tables — doesn't satisfy the confirmed near-term
  multi-tenant requirement.
- Zernio's own native Workflows router for inbox handling — every reply
  stays behind our own guardrail instead.

[^2]: [App Review - Instagram Platform - Meta for Developers](https://developers.facebook.com/docs/instagram-platform/app-review/)
[^3]: [LinkedIn API for Developers: Full Integration Guide](https://www.unipile.com/linkedin-api-a-comprehensive-guide-to-integration/)
[^4]: [X (Twitter) API Pricing: Complete Guide for 2026](https://www.blotato.com/blog/twitter-api-pricing)
[^5]: [Ayrshare Pricing](https://www.ayrshare.com/pricing/)
[^6]: [OpenRouter Pricing – All Models & Providers](https://pricepertoken.com/endpoints/openrouter)
[^7]: [Zernio](https://zernio.com/), [Zernio docs](https://docs.zernio.com/) — pricing, platform coverage, MCP tool list
[^8]: [Zernio: Build a Platform (multi-tenant)](https://docs.zernio.com/multi-tenant) — Profiles model, connect flow, API key scoping
[^9]: [Zernio Webhooks](https://docs.zernio.com/webhooks) — event types, HMAC signing, retry/delivery semantics
[^10]: [Zernio Rate Limits](https://docs.zernio.com/guides/rate-limits) — per-minute/second limits, posting velocity and daily caps
