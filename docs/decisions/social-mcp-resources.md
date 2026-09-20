# ADR: MCP resources for the social-agent server (Hippo-Assist context layer)

Produced as a `dev-features`-style Phase 1 pass, scoped by explicit task
instructions rather than a `research-features` doc (none exists for this
narrow addition — the parent feature's research doc is
`docs/research/social-media-manager-agent.md`, which this ADR reads and
extends, not re-derives).

## Context

`app/api/mcp/social/route.ts` already exposes 9 MCP **tools** for
Hippo-Assist (an external conversational assistant that connects as an MCP
client and acts as this subsystem's control plane): `get_brand_profile`,
`update_brand_profile`, `list_queue`, `approve_post`, `reject_post`,
`edit_post`, `inject_signal`, `get_recent_runs`, `get_guardrail_config`. All
9 are actions — callable with arguments, read or write specific rows.

There is a separate, distinct need: a **local knowledge base for
Hippo-Assist to traverse**, plus a documented **guardrail + expectation**
boundary. MCP has a primitive for exactly this that the server doesn't use
at all yet — **resources** (readable context/documents pulled in by the
client, not invoked with arguments). Confirmed by reading the installed
`@modelcontextprotocol/sdk@1.30.0` package directly (not assumed): resources
and tools are genuinely different primitives in the SDK's own
`McpServer` class (`registerResource` vs. `registerTool`), with different
client-facing semantics (`resources/list` + `resources/read`, no input
schema).

## What a pure research pass wouldn't add

**Potential outcome (before → after):** before this change, Hippo-Assist
can only learn the brand voice, guardrail thresholds, and its own
boundaries by calling a tool and inferring intent from a data dump (or from
being told out-of-band, outside this codebase's control). After, three
`social://` URIs exist that a client lists once and reads as reference
context — the brand profile as a document rather than a call result, the
guardrail engine's actual decision logic in prose a reading model can act
on, and an explicit, code-verified statement of what Hippo-Assist can and
cannot do through this surface.

**Internal build-order conflicts:** none. This is additive to an already-
built, already-tested server; no schema decision is pending, no other
in-flight phase of the social-agent build blocks it. The one real
dependency — `get_guardrail_config`'s underlying constants
(`MAX_REVISION_PASSES`, `DAILY_OPENROUTER_SPEND_CAP_USD`,
`MIN_SIGNAL_SCORE_TO_DRAFT`) — already exists and is already imported by
`app/api/mcp/social/guardrail-config.ts`; the new `guardrail-rules` resource
reuses that same function rather than re-deriving the numbers.

**Project-sequencing conflicts:** none blocking. The MCP server itself is
already live behind `SOCIAL_MCP_API_KEY` (already set locally per the task
brief); this change doesn't depend on the still-unapplied
`0017_social_agent_foundation.sql` migration being live in production —
`brand-profile`'s resource degrades to `found: false` exactly like the
`get_brand_profile` tool already does when no row/table exists yet, so it's
safe to ship ahead of that migration being applied, same posture the tools
already have.

## Options considered

- **A — Add three `registerResource` calls directly in `route.ts`, with
  resource *content-building* logic (the guardrail-rules prose, the
  operating-scope prose, the brand-profile view shape) factored into pure,
  portable functions under `social-agent/mcp/resources.ts`.** Fit: high —
  matches the task's explicit constraint (only `route.ts` + new files under
  `social-agent/mcp/` and `app/api/mcp/social/`) and the existing
  ports-and-adapters discipline the tool handlers already follow (thin
  host-glue in `route.ts`, portable logic in `social-agent/mcp/`). Reuse:
  high — reuses `getBrandProfile`, `resolveAccountId`, `getGuardrailConfig`
  verbatim, no duplicated query or config logic. Reversibility risk: low —
  additive-only, no existing tool/route behavior touched. Effort: small.
- **B — Duplicate the guardrail thresholds and brand-profile shape as
  static strings/JSON directly inside `route.ts`.** Fit: low — violates the
  task's explicit "import the same live constants, don't hand-copy them
  into a second string" instruction; would drift the moment a threshold
  changes in `guardrail.ts`/`watchdog.ts`. Rejected outright, not a real
  option.
- **C — One combined `social://context` resource instead of three
  separate URIs.** Fit: low — the task explicitly asks for three distinct
  URIs with three distinct concerns (brand voice, decision-engine
  explanation, boundary statement); merging them would make an MCP client
  unable to fetch just the one it needs and would blur three genuinely
  different audiences (brand voice for drafting, guardrail rules for
  understanding rejections, operating scope for knowing what it's allowed
  to do). Rejected.

## Decision

**A.** Three resources, added to the existing `buildServer()` function in
`route.ts` via `server.registerResource(name, uri, metadata, readCallback)`
— confirmed as the SDK's own current, non-deprecated API (see "MCP SDK API
confirmation" below). Content-building logic for all three lives in a new
`social-agent/mcp/resources.ts`, portable (Store-port-only, no Supabase/
Next.js import), following the same discipline `brand-profile.ts`/
`recent-runs.ts`/`resolve-account.ts` already established in that
directory. `route.ts`'s resource callbacks do the host-glue wiring (call
`resolveAccountId`/`getBrandProfile`/`getGuardrailConfig`, already-existing
helpers — no new host-glue file needed since nothing here requires
Supabase/env access beyond what those already provide).

Resources:
1. `social://brand-profile` — same underlying read as `get_brand_profile`
   (`resolveAccountId` + `getBrandProfile`), reframed as a document.
2. `social://guardrail-rules` — prose explanation of
   `guardrail.ts`'s `decideGuardrailOutcome`'s actual priority-ordered
   rules, with the live numeric values from `getGuardrailConfig()`
   interpolated in (not hand-copied).
3. `social://operating-scope` — static boundary statement, each claim
   checked against the real tool/guardrail/state-machine code (see the
   build report for exactly what was checked).

## Rejected alternatives

- B: duplicated constants that can silently drift from the code that
  actually enforces them — directly contradicts the task's own explicit
  instruction and this project's established "don't re-declare a source of
  truth" pattern (`guardrail-config.ts`'s own header comment already states
  this principle for the tool this resource parallels).
- C: collapses three distinct audiences/concerns into one URI a client
  can't selectively fetch — worse ergonomics for no offsetting benefit.

## Outcome

Hippo-Assist gains a genuine "read this for context" surface distinct from
its existing "call this to act" surface, matching MCP's own primitive
split. No behavior of the 9 existing tools changes.

## Conflicts identified

- Internal build order: none — additive only, no dependency on unbuilt
  work.
- Project sequencing: none blocking — doesn't require the still-unapplied
  `0017_social_agent_foundation.sql` migration to be live; degrades
  gracefully exactly like the existing tools do when the table/row is
  missing.
- Explicitly out of scope, not attempted: semantic/vector search
  (`pgvector`) over historical posts/rejections — deferred by the user's
  own explicit instruction, to be revisited once real post/rejection
  history exists to search over.
