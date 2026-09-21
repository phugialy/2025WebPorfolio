# ADR: Admin dashboard + settings UI for the social-agent (viewing/editing what already exists)

Produced as a `dev-features`-style Phase 1 pass, scoped by explicit task
instructions rather than a fresh `research-features` doc — the parent
feature's research doc is `docs/research/social-media-manager-agent.md`
(read in full, not re-derived), and the most recent sibling ADR,
`docs/decisions/social-mcp-resources.md`, is the direct precedent for this
one's shape (same "reuse the shared logic, don't re-derive it" discipline,
same file-scoping style).

## Context

Two admin surfaces already exist for the social-agent subsystem:
`app/admin/social/queue/*` (the human approval queue, read+write) and
`app/api/mcp/social/route.ts` (9 tools + 3 resources for Hippo-Assist, a
separate conversational client, bearer-token-authed). Two gaps remained,
both explicitly scoped as *viewing/editing what's already there* — no new
backend capability:

1. No read-only glanceable view of the system's health (recent runs,
   guardrail config, brand profile, queue depth, spend vs. cap) for a human
   using the browser admin UI (Google-session-gated), as opposed to asking
   Hippo-Assist conversationally or querying Supabase directly.
2. No way for the human operator to edit the brand profile from the browser
   admin UI at all — today that write path exists only through Hippo-Assist's
   `update_brand_profile` MCP tool, which requires going through a
   conversational client rather than a simple form.

## Potential outcome (before → after)

**Before**: brand-profile edits require either a direct Supabase write or a
Hippo-Assist conversation; there is no glanceable "is this healthy" view in
the browser admin UI at all — an operator has to check `/admin/social/queue`
(action-only, no context), query Supabase directly, or ask Hippo-Assist.

**After**: `/admin/social/dashboard` (read-only: recent runs, guardrail
config, brand profile summary, queue depth, trailing 24h spend vs. cap) and
`/admin/social/settings` (an editable form for voice/tone/banned-topics/
disclosure-template) exist as Google-session-gated pages, plus a minimal
`/admin/social` index linking all three admin surfaces (queue, dashboard,
settings). No pipeline, guardrail, or state-machine behavior changes —
this is presentation and a second write path onto data that already exists
and is already written to by other surfaces.

## Potential conflicts

**Internal build-order conflicts**: none. Both new surfaces are additive,
read from tables/functions that already exist (`social_runs`,
`social_brand_profile`, `social_posts`), and write through the exact same
`updateBrandProfile` function the MCP tool already uses — no schema
decision is pending, no other in-flight phase of the social-agent build
blocks this.

**Project-sequencing conflicts**: none blocking. This doesn't depend on any
new migration — `supabase/migrations/0017_social_agent_foundation.sql` is
already applied and RLS-verified live per the research doc's Implementation
status section. Both new routes degrade gracefully (empty/`found: false`
state, not a hard failure) if `social_accounts`/`social_brand_profile` rows
don't exist yet for a given deployment, the same posture every existing
social-agent route already takes.

## Options considered

- **A — Two new admin pages (`dashboard`, `settings`), each backed by one
  new admin API route, both calling into the exact same portable functions
  the MCP server's tools/resources already call (`getRecentRuns`,
  `getGuardrailConfig`, `getBrandProfile`/`updateBrandProfile`,
  `listGuardrailPendingQueue`, `evaluateSocialWatchdog`), auth-gated with
  `requireAdminSession()` like the existing queue route.** Fit: high —
  matches the task's explicit file scope
  (`app/admin/social/dashboard/`, `app/admin/social/settings/`,
  `app/api/admin/social/dashboard/`, `app/api/admin/social/settings/`) and
  this repo's own `seo-board.tsx` (read-only dashboard) /
  `queue-board.tsx` (action form) patterns. Reuse: high — zero
  reimplementation of brand-profile read/write, guardrail-config reporting,
  queue counting, or spend summation; every one of those already has
  exactly one implementation, and this task adds a third *caller*, not a
  second *implementation*. Reversibility risk: low — additive-only, no
  existing route/tool/pipeline behavior touched (confirmed: no edits to
  `/social-agent/pipeline/*`, `/social-agent/reliability/*`,
  `app/social-agent-adapters/*`, `app/api/mcp/*`, or the queue's own
  page/route). Effort: small-to-medium (two new pages, two new routes, one
  new test file).
- **B — Reimplement brand-profile read/write directly in the settings
  route (a second Supabase query/update inline), instead of importing
  `social-agent/mcp/brand-profile.ts`.** Fit: low — explicitly rejected by
  the task's own instruction ("not a third reimplementation... keep it to
  one, shared") and by this project's own established precedent
  (`queue-shared.ts`'s header comment states the same principle for the
  queue actions). Rejected outright.
- **C — Fold dashboard content into the existing queue page instead of a
  separate route/page.** Fit: low — the queue page is an action surface
  (approve/edit/reject), and `seo-board.tsx` already establishes this
  project's own precedent for keeping a read-only report board separate
  from an action queue; conflating them would also make the queue page's
  already-real polling/action flow harder to reason about. Rejected.
- **D — Let the settings form also expose guardrail numeric thresholds,
  gated behind a "danger zone" UI affordance.** Fit: none — directly
  contradicts the task's explicit, repeated instruction that these three
  constants stay code-only. Not seriously considered.

## Decision

**A.** Two new pages, two new admin API routes, reusing existing portable
functions verbatim:

- `app/admin/social/dashboard/page.tsx` + `dashboard-board.tsx` (client
  component, modeled on `seo-board.tsx`'s fetch-on-mount + stat-cards +
  tables shape) ← `app/api/admin/social/dashboard/route.ts` (GET,
  `requireAdminSession()`-gated), which calls `resolveAccountId`,
  `getRecentRuns`, `getBrandProfile` + `buildBrandProfileResource`,
  `getGuardrailConfig`, `listGuardrailPendingQueue`, and
  `evaluateSocialWatchdog` (the watchdog's own pure cost-summing function,
  called directly against a 24h-scoped `social_runs` fetch — no email side
  effect, since this route never calls the enclosing `runSocialWatchdog`
  orchestrator).
- `app/admin/social/settings/page.tsx` + `settings-board.tsx` (client
  component, minimal form: voice textarea, two `StringListField`
  repeatable-list-of-strings components for tone guidelines/banned topics,
  one disclosure-template input, one Save button) ← `app/api/admin/social/
  settings/route.ts` (GET + PATCH, `requireAdminSession()`-gated), which
  calls `resolveAccountId` + `getBrandProfile`/`updateBrandProfile` from
  `social-agent/mcp/brand-profile.ts` — the exact same functions the
  `update_brand_profile` MCP tool already calls, imported directly, not
  reimplemented (see the build report for the literal import line).
- `app/admin/social/page.tsx` — a minimal index (three links: queue,
  dashboard, settings), since none existed yet and the task explicitly
  scoped this as reasonable but small.

Guardrail-threshold boundary enforced structurally, not just by UI
omission: `PatchBody` in `settings/route.ts` only declares
`voice_description`/`tone_guidelines`/`banned_topics`/`disclosure_template`
— there is no field, no destructure, and no import of
`MAX_REVISION_PASSES`/`DAILY_OPENROUTER_SPEND_CAP_USD`/
`MIN_SIGNAL_SCORE_TO_DRAFT` anywhere in that file. The dashboard route
*reads* `getGuardrailConfig()` (display-only, same read-only function the
MCP tool uses) but has no PATCH handler at all.

## Rejected alternatives

- B: a second brand-profile read/write implementation that could drift
  from the MCP tools' — directly contradicts the task's own instruction and
  this project's established "don't re-declare a source of truth" pattern.
- C: blending a read-only report board into an action-queue page — this
  project already has a working precedent for keeping those separate
  (`seo-board.tsx` vs. `moderation-board.tsx`/`queue-board.tsx`).
- D: any settings-UI path to guardrail numeric thresholds — directly
  contradicts the task's explicit, repeated instruction.

## Outcome

An operator can now see system health (dashboard) and edit brand voice
(settings) from the browser admin UI without going through Hippo-Assist or
a direct Supabase query, using the exact same underlying read/write logic
every other surface already uses. No pipeline/guardrail/state-machine
behavior changes.

## Conflicts identified

- Internal build order: none — additive only, no dependency on unbuilt
  work, no schema change.
- Project sequencing: none blocking — the one migration this feature reads/
  writes against is already applied and verified live; both new routes
  degrade gracefully if a `social_accounts` row doesn't exist yet.
- Explicitly out of scope, not attempted: any edit path for guardrail
  numeric thresholds (by design, per the task); a richer/sortable array
  editor for tone guidelines/banned topics (by design, per the task's
  minimalism instruction); real-time/streaming dashboard updates (a
  fetch-on-mount read, same as `seo-board.tsx`, not a live-updating view).
