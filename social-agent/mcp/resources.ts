// MCP *resource* content for the social-agent server
// (app/api/mcp/social/route.ts) -- distinct from the 9 MCP *tools* already
// registered there. A tool is an action Hippo-Assist calls with arguments;
// a resource is a document Hippo-Assist pulls in as standing context. See
// docs/decisions/social-mcp-resources.md for the full ADR.
//
// Portable, per social-agent/README.md's boundary rule: no
// `@supabase/supabase-js` import, no `process.env.X` read, no Next.js
// import. Every function here is either pure (takes its inputs as plain
// parameters) or depends only on the `Store` port -- route.ts's resource
// read-callbacks do the host-glue wiring (calling `resolveAccountId`,
// `getBrandProfile`, `getGuardrailConfig`, all already-existing helpers)
// and pass the results in.
//
// `GuardrailRulesConfig` intentionally re-declares the same shape as
// app/api/mcp/social/guardrail-config.ts's `GuardrailConfig` rather than
// importing it -- that file is host-glue (it imports from Next.js route
// files, which aren't portable), and social-agent/mcp/recent-runs.ts's own
// header comment already establishes this exact precedent for this exact
// reason (a structurally-identical local type instead of an import across
// the portability boundary). The NUMBERS still come from one source of
// truth (`getGuardrailConfig()`, called once in route.ts and threaded
// through) -- only the TYPE shape is duplicated, never the values.

import type { SocialBrandProfile } from "../pipeline/types";

// ---------------------------------------------------------------------
// social://brand-profile
// ---------------------------------------------------------------------

export type BrandProfileResourceContent = {
  found: boolean;
  account_id?: string;
  voice_description?: string;
  tone_guidelines?: string[];
  banned_topics?: string[];
  disclosure_template?: string;
};

/**
 * Formats an already-fetched brand profile row (via
 * social-agent/mcp/brand-profile.ts's `getBrandProfile` -- reused, not
 * duplicated) into the resource's wire shape. Same field mapping as the
 * `get_brand_profile` tool's `structuredContent`, since this is the same
 * underlying data reframed as a document rather than a tool-call result.
 */
export function buildBrandProfileResource(
  profile: SocialBrandProfile | null,
  accountId: string
): BrandProfileResourceContent {
  if (!profile) return { found: false };
  return {
    found: true,
    account_id: accountId,
    voice_description: profile.voice,
    tone_guidelines: profile.toneRules,
    banned_topics: profile.bannedTopics,
    disclosure_template: profile.disclosureTemplate,
  };
}

// ---------------------------------------------------------------------
// social://guardrail-rules
// ---------------------------------------------------------------------

/** Same shape as app/api/mcp/social/guardrail-config.ts's `GuardrailConfig` -- see the file header for why this isn't an import. */
export type GuardrailRulesConfig = {
  maxRevisionPasses: number;
  dailyOpenRouterSpendCapUsd: number;
  minSignalScoreToDraft: number;
};

/**
 * Prose explanation of social-agent/pipeline/guardrail.ts's
 * `decideGuardrailOutcome` -- read that function's own logic and comments
 * directly to write this, not the research doc, per the task's explicit
 * instruction that the code is the source of truth. Every rule below is
 * stated in the same priority order the function itself checks them in,
 * and the numeric values are interpolated from `config` (the caller passes
 * in `getGuardrailConfig()`'s live output) rather than hand-copied, so this
 * text and the actual numbers can't drift apart.
 */
export function buildGuardrailRulesResource(config: GuardrailRulesConfig): string {
  return `# Guardrail decision engine -- how a queued draft's outcome is actually decided

This document describes exactly what social-agent/pipeline/guardrail.ts's
\`decideGuardrailOutcome\` function does. It is a pure function with no LLM
call inside it -- the Guardrail Critic's LLM call only fills in the input
fields it reads (checks, disclosurePresent, sensitiveTopicFlags,
repetitionRisk, escalate); this code, not the model's own judgment, makes
the final publish / revise / reject call. The rules below are evaluated in
this exact order, and the FIRST one that matches wins -- nothing below a
matching rule is even consulted.

1. Disclosure hard gate -- unconditional, checked first, no score can
   override it. If the draft requires an FTC disclosure
   (\`disclosureRequired\`) and the draft's own text does not visibly
   contain one (\`!disclosurePresent\`) -> REJECT. \`disclosureRequired\` is
   itself a code-owned heuristic (affiliate/sponsorship keyword match, see
   \`detectDisclosureRequired\`), deliberately biased toward requiring
   disclosure when uncertain -- a false positive costs a revise loop, a
   false negative is a real compliance problem.

2. Accuracy / policy-fit reject threshold. If \`factualAccuracy < 4\` OR
   \`platformPolicyFit < 4\` (each scored 1-5) -> REJECT.

3. Budget check. If \`budgetOk\` is false -- meaning today's OpenRouter
   spend has reached or exceeded the daily cap of
   $${config.dailyOpenRouterSpendCapUsd} -- -> REJECT. \`budgetOk\` is a
   code-owned fact computed from real spend, never asked of the model.

4. Escalate routing. If \`escalate\` is true (the draft touches
   pricing/terms commitments, complaints, or legal-adjacent topics) ->
   REVISE, not reject. This routes the post back through another pass with
   an escalation note attached, so it reliably lands in the human approval
   queue instead of being silently auto-rejected or auto-passed.

5. Remaining-dimension revise check -- only reached if none of rules 1-4
   fired. If \`brandVoiceFit <= 3\` OR \`spamPatternRisk <= 3\` OR
   \`repetitionRisk >= 4\` -> REVISE.

6. Otherwise -> PUBLISH.

A "publish" verdict from this function does NOT itself publish anything --
see the \`social://operating-scope\` resource for what actually happens to
a post after this verdict is reached.

Revision cap: a single post can be sent back for revision at most
${config.maxRevisionPasses} times (\`MAX_REVISION_PASSES\`, the same
constant \`get_guardrail_config\` reports). If a post is still landing on
"revise" after that many passes, social-agent/pipeline/state-machine.ts
rejects it outright (status -> rejected, with the last guardrail note as
the rejection reason) rather than looping indefinitely.

Draft-eligibility floor: a signal needs a relevance score of at least
${config.minSignalScoreToDraft} (1-5) before the Strategist will build a
content brief from it in the first place -- this is upstream of the
guardrail entirely, but is the same "minimum bar before spending a model
call" family of threshold, which is why \`get_guardrail_config\` reports it
alongside the guardrail numbers above.`;
}

// ---------------------------------------------------------------------
// social://operating-scope
// ---------------------------------------------------------------------

/**
 * Static boundary statement -- no live data needed, so this takes no
 * parameters. Every claim in this text was checked directly against the
 * real tool implementations and pipeline code before being written here;
 * see docs/decisions/social-mcp-resources.md and the MCP-resources build
 * report for exactly what was checked.
 */
export function buildOperatingScopeResource(): string {
  return `# Operating scope -- what Hippo-Assist can and cannot do through this MCP server

This is the actual boundary of what the social-agent MCP server
(app/api/mcp/social/route.ts) lets you, Hippo-Assist, do. It is written
from the real tool/guardrail/state-machine code, not aspirational.

## Brand profile writes are immediate, with no approval gate

\`update_brand_profile\` writes directly to \`social_brand_profile\` the
moment you call it -- there is no review queue and no human confirmation
step in between. This is deliberate: when you call this tool, you are
acting as the operator's own interface (the same trust level a logged-in
admin has in the queue UI), not as the pipeline proposing a change to
itself. This is DIFFERENT from the weekly Retro's own brand-profile
suggestions, which land as a pending diff an operator must approve --
that mechanism is untouched by this tool.

## Queue actions act directly on real posts -- except approving, which is two-step

\`reject_post\` and \`edit_post\` act directly on real \`social_posts\` rows --
there is no separate confirmation step inside those calls; calling the
tool IS the action. \`reject_post\` and \`edit_post\` do not publish
anything; they change a row's status/text only.

\`approve_post\` is different, and deliberately so: it is the one action in
this entire server that can lead to a real publish, so a single call is
never sufficient here, regardless of what consent gate you already run on
your own side. The server itself now enforces a two-step confirmation
(see \`docs/decisions/mcp-approve-post-confirmation.md\`): a first call
(omitting \`confirmationCode\`, or supplying a wrong/expired one) makes NO
change to the post and instead returns a short-lived numeric
\`confirmationCode\`; only a second call for the same post, with that exact
code, before it expires, actually approves. A mismatched or stale code is
treated identically to a first call -- a fresh code is issued, never
partially accepted. This is defense-in-depth on our side specifically
because it should never be true that your gate is the only thing standing
between a single tool call and a real publish.

Once genuinely confirmed, calling \`approve_post\` moves a post's status to
\`approved\`; on the pipeline's NEXT tick (the cron-driven state machine in
social-agent/pipeline/state-machine.ts), the \`"approved"\` case calls
\`platform.createPost\`, which is a real call against a live,
Zernio-connected account (Facebook and Instagram, both real and connected
today -- confirmed against Zernio's own API when they were provisioned,
per docs/research/social-media-manager-agent.md's Implementation status
section). Confirming an approval is not itself the publish -- it is the
action that guarantees the publish happens on the next tick, with nothing
further required from you or a human.

## \`inject_signal\` only ever proposes a topic

\`inject_signal\` writes one \`social_signals\` row (source = "operator")
and nothing else -- confirmed directly against
social-agent/pipeline/signal-scan.ts's \`injectOperatorSignal\`, which does
exactly one \`store.insert\` and returns. It never drafts copy, never
touches \`social_posts\`, and never publishes. The Strategist reads that
row on its own next run, exactly like any RSS/GSC-sourced signal -- calling
this tool guarantees a topic gets considered, not that anything gets
written or posted.

## Guardrail numeric thresholds cannot be changed through this server

There is no tool on this server that writes guardrail thresholds.
\`get_guardrail_config\` is read-only by design -- it has no corresponding
write tool, and its own implementation
(app/api/mcp/social/guardrail-config.ts) imports the real constants
(\`MAX_REVISION_PASSES\`, the daily spend cap, the minimum signal score)
directly from the pipeline code that enforces them; there is no write path
anywhere in this MCP server that reaches those values. This is the actual
mechanism enforcing the boundary, not a policy you are asked to
self-observe: changing any of these numbers requires a code change and
review, the same as changing the disclosure hard gate itself in
\`social-agent/pipeline/guardrail.ts\` would.

## What this resource does not cover

Semantic/historical search over past posts or rejections (a vector-search
capability over \`social_posts\`/\`social_signals\` history) does not exist
on this server -- it is explicitly deferred, pending real post/rejection
history to search over. Do not assume you can query "what have we posted
about X before" beyond what \`get_recent_runs\` and \`list_queue\` already
surface.`;
}
