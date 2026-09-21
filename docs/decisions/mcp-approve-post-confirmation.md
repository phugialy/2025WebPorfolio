# ADR: Two-step confirmation on the MCP server's `approve_post` tool

Produced as a `dev-features`-style Phase 1 pass, scoped by explicit task
instructions rather than a fresh `research-features` doc (none needed — the
parent feature's research doc is
`docs/research/social-media-manager-agent.md`, and the sibling ADR
`docs/decisions/social-mcp-resources.md` already establishes the pattern
this one follows: read the parent doc, extend it narrowly, don't re-derive
it).

## Context

`app/api/mcp/social/route.ts` exposes an `approve_post` MCP tool for
Hippo-Assist (a separate project's conversational control plane). Today, a
single call moves a `social_posts` row from `guardrail_pending` to
`approved` via `applyQueueAction` (`app/api/mcp/social/queue-shared.ts`) —
and `approved` is the one status the pipeline's next tick will pick up and
actually call the real Zernio `Platform.createPost` against (two live,
verified-connected accounts: Facebook Page "Hippo On Tech", Instagram
Business @hippo_blog_phugialy). Hippo-Assist has built its own client-side
consent gate in front of ever calling this tool — necessary, but this
server currently has zero protection of its own: if that upstream gate is
ever misconfigured, buggy, or bypassed, one `approve_post` call is enough.

This is explicitly **not** about the browser admin UI's Approve action
(`app/api/admin/social/queue/[id]/route.ts` → `queue-shared.ts`'s
`applyQueueAction`) — that path already sits behind a logged-in human
physically clicking a button behind Google admin-session auth
(`admin-auth.ts`), which this task's own instructions call "already a
strong gate" and require be left with zero added friction.

## Potential outcome (before → after)

**Before:** one `approve_post` MCP call, with just `id` (and optionally
`finalCopy`/`actor`), immediately flips the row to `approved` — nothing on
this server's side distinguishes "Hippo-Assist's own gate genuinely
confirmed with a human" from "the model called this tool once, confidently
and wrongly."

**After:** the first `approve_post` call for a given post (no
`confirmationCode`, or a stale/wrong one) generates a short numeric code,
stores it against that row with a 5-minute expiry, and returns it —
**without approving anything**. Only a second call, same `id`, with that
exact unexpired code, actually calls `applyQueueAction`. A mismatched or
expired code is treated identically to a fresh call (fail closed, no signal
about how close a guess was). The code is single-use — cleared on success,
replaced (not reused) on any failed attempt.

## Potential conflicts

**Internal build-order conflicts:** none. This is additive to an
already-built, already-tested server; `applyQueueAction`'s own signature and
behavior are untouched (see Decision below), so nothing else in the
pipeline, state machine, or admin UI needs to change in step with this.

**Project-sequencing conflicts:** the new `approval_confirmation_code` /
`approval_confirmation_expires_at` columns don't exist in production yet —
this ADR's migration (`0018_social_posts_approval_confirmation.sql`) is
**written, not applied** (see Non-negotiables — migrations are handed off,
never self-applied). Until it's applied, `approve_post` calls made against
production would either read `null` for both columns (safe — same "no
matching code yet" branch fresh-issues a code) or, if Supabase rejects
writes to columns that don't exist, fail loudly rather than silently
approving — either way, **fails closed, never fails open**, so shipping
this code ahead of the migration being applied does not create a bypass.
Applying the migration remains a blocking dependency for the tool to
*function* (issue/verify codes) even though it's not a safety regression
if unapplied.

## Options considered

- **A — Two nullable columns directly on `social_posts`
  (`approval_confirmation_code`, `approval_confirmation_expires_at`), a new
  portable `resolveApprovalConfirmation` helper under
  `social-agent/mcp/approval-confirmation.ts` (Store-port-only, matching
  every other file in that directory), wired into `approve_post`'s handler
  in `route.ts` before it calls `applyQueueAction`.** Fit: high — matches
  the task's explicit file scope (`route.ts` + new files only,
  `applyQueueAction` untouched), and this table's own existing convention of
  per-row workflow-state columns (`approved_by`, `rejection_reason`,
  `edited_before_approval`) rather than a side table. Reuse: high — reuses
  the existing `Store` port, the existing `createSupabaseStore()` instance
  already constructed in `route.ts`, and the existing
  `DAILY_OPENROUTER_SPEND_CAP_USD`-style named-constant convention
  (`social-agent/reliability/watchdog.ts`) for the expiry window. Reversibility
  risk: low — additive columns, additive logic, zero change to any existing
  call path. Effort: small.
- **B — A separate `social_post_approval_confirmations` table.** Fit:
  low — this is single-row, single-in-flight-attempt state scoped to one
  post's current approval cycle, not a new entity with its own lifecycle or
  history worth querying independently; every other per-row workflow-state
  field on this table already lives as columns, not a join. Rejected as
  needless normalization for a two-column, always-1:1, frequently-nulled
  value.
- **C — In-memory/module-level code cache instead of a DB column.**
  Fit: none — this route explicitly runs as a **stateless serverless
  function**, a fresh `McpServer` per request per the route's own header
  comment ("no transport or session is cached across invocations"). A
  module-level variable would not survive between the two calls of the
  two-step flow on Vercel. Rejected outright, not a real option.
- **D — Reuse `applyQueueAction`'s own `patch` mechanism to store the code
  (e.g. piggyback on an existing column or stash it in `guardrail_review`
  jsonb).** Fit: low — the task is explicit that `applyQueueAction`'s
  signature and behavior must not change, and jsonb columns are pipeline
  data with their own defined shape (`SocialGuardrailReview`); repurposing
  one for confirmation state would blur two unrelated concerns onto one
  column. Rejected.

## Decision

**A.** Two new nullable columns, a new portable helper module, `route.ts`
gains one import and a few lines in `approve_post`'s handler — nothing else
changes.

**Confirmation code format**: 6-digit numeric, zero-padded (e.g.
`"482913"`), generated via `crypto.getRandomValues` when available
(fallback: `Math.random`) — same "use Web Crypto when present, degrade
gracefully" pattern `social-agent/mcp/brand-profile.ts`'s
`defaultIdGenerator` already establishes in this codebase. Reasoning, stated
explicitly per the task:
the threat model here is *an LLM calling this tool over-eagerly or by
mistake without genuine upstream human confirmation*, not *a remote
attacker without API access brute-forcing a 6-digit space* — anyone able to
call this tool at all already holds `SOCIAL_MCP_API_KEY`, a separate,
larger trust boundary this task isn't re-litigating. A short numeric code
is also the most naturally "readable in a chat transcript" format (`"confirm
with 482913"`), which is exactly the channel this confirmation is meant to
travel over.

**Expiry**: 5 minutes, a named constant
(`APPROVAL_CONFIRMATION_CODE_TTL_MINUTES`) in
`social-agent/mcp/approval-confirmation.ts`, matching this project's
established convention for cost/threshold constants
(`DAILY_OPENROUTER_SPEND_CAP_USD` in `watchdog.ts`, `MAX_REVISION_PASSES` in
`guardrail.ts`) — a bare number was never this project's pattern for a
value like this.

**Schema**: `approval_confirmation_code text`,
`approval_confirmation_expires_at timestamptz` on `social_posts`, in a new
migration `0018_social_posts_approval_confirmation.sql` (0017 — already
applied and verified live — is never edited, per this project's migration
discipline and the task's explicit instruction). Both camelCase field names
used in code (`approvalConfirmationCode`, `approvalConfirmationExpiresAt`)
were checked against `app/social-agent-adapters/store.ts`'s
`toSnakeCase`/`toCamelCase` mechanical conversion **before** assuming an
alias was needed — both round-trip correctly with no entry required in
`FIELD_ALIASES`, so that file is not touched.

## Rejected alternatives

- B: unnecessary normalization for single-row, always-1:1, mostly-null
  state that this table's own existing columns (`approved_by`,
  `rejection_reason`) already establish the pattern for storing inline.
- C: architecturally impossible against this route's confirmed-stateless
  per-request model.
- D: would either violate the task's explicit "don't touch
  `applyQueueAction`" constraint or repurpose a column with its own defined
  contract for an unrelated concern.

## Outcome

`approve_post` requires two calls to actually approve a post, with the
first call causing zero state change to the post's `status`/`final_text`/
`approved_by`. `list_queue`, `reject_post`, `edit_post`, and every other MCP
tool are untouched. The browser admin UI's Approve action
(`app/api/admin/social/queue/[id]/route.ts`, `queue-shared.ts`'s
`applyQueueAction`) is completely unchanged — confirmed by diff in the build
report.

## Conflicts identified

- Internal build order: none — additive only, `applyQueueAction`'s contract
  is preserved exactly.
- Project sequencing: the new migration is a **blocking dependency for this
  tool to function** (issue/verify codes against real columns) but not a
  safety regression if left unapplied — every failure mode here fails
  closed (see "Potential conflicts" above). Migration is written, not
  applied, per Non-negotiables; independent confirmation of its live status
  belongs to whoever applies it, checked via a real read query before any
  code that assumes it's live ships further.
- Explicitly out of scope, not attempted: widening `Platform`'s `reply`
  signature (a pre-existing, separately-flagged limitation in the parent
  research doc, unrelated to this change) — not touched here.
