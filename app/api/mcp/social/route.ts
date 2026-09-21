import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod";
import { createSupabaseStore } from "@/app/social-agent-adapters/store";
import { injectOperatorSignal } from "@/social-agent/pipeline/signal-scan";
import { resolveAccountId } from "@/social-agent/mcp/resolve-account";
import { getBrandProfile, updateBrandProfile } from "@/social-agent/mcp/brand-profile";
import { getRecentRuns } from "@/social-agent/mcp/recent-runs";
import { APPROVAL_CONFIRMATION_CODE_TTL_MINUTES, resolveApprovalConfirmation } from "@/social-agent/mcp/approval-confirmation";
import { buildBrandProfileResource, buildGuardrailRulesResource, buildOperatingScopeResource } from "@/social-agent/mcp/resources";
import { isAuthorizedSocialMcpRequest } from "./auth";
import { listGuardrailPendingQueue, applyQueueAction } from "./queue-shared";
import { getGuardrailConfig } from "./guardrail-config";

// MCP server for Hippo-Assist (the conversational control plane for this
// social-media-manager subsystem, a separate project) -- see
// docs/research/social-media-manager-agent.md's "Platform layer: Zernio"
// section (Zernio's own hosted MCP server is the direct precedent for
// hosting one here) and "Communication protocol / UI-UX" (this is a new,
// fourth surface alongside the approval queue, performance dashboard, and
// email digest -- a conversational one, for the same underlying data and
// actions the admin queue already exposes).
//
// Built with the official `@modelcontextprotocol/sdk` (new dependency --
// this project has only ever CONSUMED third-party MCP servers before, via
// Zernio and Claude Code's own tooling, never hosted one, so there was no
// existing plain-fetch convention here to follow instead). Uses the SDK's
// `WebStandardStreamableHTTPServerTransport` (confirmed as the SDK's own
// current recommendation for this exact deployment shape -- see this
// route's own build report for what was actually checked, not guessed at:
// the published npm package's bundled `src/examples/server/
// honoWebStandardStreamableHttp.js` example, whose own comment reads
// "works on any runtime: Node.js, Cloudflare Workers, Deno, Bun, etc." and
// whose `handleRequest(request: Request): Promise<Response>` signature
// takes/returns plain Fetch API objects -- the same shape a Next.js route
// handler's own `(request: Request) => Promise<Response>` already is, no
// adapter layer needed).
//
// STATELESS, matching this project's serverless deployment model (no
// persistent process, per the task): a fresh `McpServer` and a fresh
// `WebStandardStreamableHTTPServerTransport` (constructed with no
// `sessionIdGenerator`, which the SDK's own docs mark as what puts it in
// stateless mode) are created for EVERY request, exactly as the SDK's own
// bundled stateless example (`simpleStatelessStreamableHttp.js`) does it --
// no transport or session is cached across invocations, which is also what
// sidesteps a real, currently-open SDK issue (typescript-sdk#1994) where a
// REUSED stateless transport instance 500s on a request after its first.
// Only POST is implemented, also matching that same official example
// (which explicitly 405s GET/DELETE in its stateless variant) -- Next.js
// itself already returns 405 for any HTTP method this file doesn't export
// a handler for, so GET/DELETE need no explicit handling here.

function buildServer(): McpServer {
  const server = new McpServer({ name: "phugialy-social-agent", version: "1.0.0" });
  const store = createSupabaseStore();

  // ---------------------------------------------------------------------
  // Brand profile
  // ---------------------------------------------------------------------

  server.registerTool(
    "get_brand_profile",
    {
      title: "Get brand profile",
      description:
        "Reads the social_brand_profile row for an account -- voice, tone rules, banned topics, and the standing FTC disclosure template. Read-only.",
      inputSchema: {
        accountId: z
          .string()
          .optional()
          .describe("social_accounts.id. Omit to auto-resolve the single account, when there's exactly one."),
      },
      outputSchema: {
        found: z.boolean(),
        account_id: z.string().optional(),
        voice_description: z.string().optional(),
        tone_guidelines: z.array(z.string()).optional(),
        banned_topics: z.array(z.string()).optional(),
        disclosure_template: z.string().optional(),
      },
    },
    async ({ accountId }) => {
      const resolved = await resolveAccountId(store, accountId);
      if (!resolved.ok) return errorResult(resolved.error);

      const profile = await getBrandProfile(store, resolved.accountId);
      const structuredContent = profile
        ? {
            found: true,
            account_id: profile.accountId,
            voice_description: profile.voice,
            tone_guidelines: profile.toneRules,
            banned_topics: profile.bannedTopics,
            disclosure_template: profile.disclosureTemplate,
          }
        : { found: false };

      return jsonResult(structuredContent);
    }
  );

  server.registerTool(
    "update_brand_profile",
    {
      title: "Update brand profile",
      description:
        "Direct write to social_brand_profile (voice_description / tone_guidelines / banned_topics / disclosure_template). No approval gate -- Hippo-Assist is acting as the operator's own interface here, the same trust level as the logged-in admin queue UI, not the weekly Retro's self-proposal mechanism (which this tool does not touch). Only fields you pass are changed. The response includes the PREVIOUS values alongside the new ones, so a change is visible as a diff after the fact even without a pre-flight confirmation step -- useful since this tool's effect persists across every future post, not just the current conversation.",
      inputSchema: {
        accountId: z.string().optional().describe("social_accounts.id. Omit to auto-resolve."),
        voice_description: z.string().optional(),
        tone_guidelines: z.array(z.string()).optional(),
        banned_topics: z.array(z.string()).optional(),
        disclosure_template: z.string().optional(),
      },
      outputSchema: {
        account_id: z.string(),
        voice_description: z.string().optional(),
        tone_guidelines: z.array(z.string()).optional(),
        banned_topics: z.array(z.string()).optional(),
        disclosure_template: z.string().optional(),
        previous: z
          .object({
            voice_description: z.string().optional(),
            tone_guidelines: z.array(z.string()).optional(),
            banned_topics: z.array(z.string()).optional(),
            disclosure_template: z.string().optional(),
          })
          .optional()
          .describe("The profile's values immediately before this write -- absent only when no brand-profile row existed yet."),
      },
    },
    async ({ accountId, voice_description, tone_guidelines, banned_topics, disclosure_template }) => {
      const resolved = await resolveAccountId(store, accountId);
      if (!resolved.ok) return errorResult(resolved.error);

      // Fetched before the write specifically to give the caller a diff --
      // see this tool's own description and docs/decisions/mcp-approve-post-confirmation.md's
      // sibling reasoning: update_brand_profile doesn't get a pre-flight gate
      // (the effect is internal/reversible, unlike approve_post), but its
      // effect persists across every future post, so after-the-fact
      // visibility is still worth the one extra read.
      const before = await getBrandProfile(store, resolved.accountId);

      const updated = await updateBrandProfile(store, resolved.accountId, {
        ...(voice_description !== undefined ? { voice: voice_description } : {}),
        ...(tone_guidelines !== undefined ? { toneRules: tone_guidelines } : {}),
        ...(banned_topics !== undefined ? { bannedTopics: banned_topics } : {}),
        ...(disclosure_template !== undefined ? { disclosureTemplate: disclosure_template } : {}),
      });

      return jsonResult({
        account_id: updated.accountId,
        voice_description: updated.voice,
        tone_guidelines: updated.toneRules,
        banned_topics: updated.bannedTopics,
        disclosure_template: updated.disclosureTemplate,
        ...(before
          ? {
              previous: {
                voice_description: before.voice,
                tone_guidelines: before.toneRules,
                banned_topics: before.bannedTopics,
                disclosure_template: before.disclosureTemplate,
              },
            }
          : {}),
      });
    }
  );

  // ---------------------------------------------------------------------
  // Approval queue -- shared logic with app/api/admin/social/queue/*
  // (see ./queue-shared.ts for exactly what's shared vs. duplicated, and
  // why, per the task's own instruction on this point).
  // ---------------------------------------------------------------------

  server.registerTool(
    "list_queue",
    {
      title: "List approval queue",
      description:
        "Lists social_posts rows at status = 'guardrail_pending' -- the same query app/api/admin/social/queue/route.ts's admin UI uses. Read-only.",
      inputSchema: {},
      outputSchema: {
        posts: z.array(
          z.object({
            id: z.string(),
            account_id: z.string(),
            platform: z.string(),
            status: z.string(),
            draft_copy: z.string().nullable(),
            final_copy: z.string().nullable(),
            guardrail_verdict: z.unknown(),
            approved_by: z.string().nullable(),
            rejection_reason: z.string().nullable(),
            created_at: z.string(),
          })
        ),
        migrationPending: z.boolean().optional(),
      },
    },
    async () => {
      const result = await listGuardrailPendingQueue();
      if (!result.ok) return errorResult(result.error);
      return jsonResult({ posts: result.posts, migrationPending: result.migrationPending });
    }
  );

  server.registerTool(
    "approve_post",
    {
      title: "Approve a queued post (two-step confirmation required)",
      description:
        `Approves a social_posts row (status -> approved), optionally overwriting its final copy first. ` +
        `This is a TWO-STEP action, enforced by this server itself, independent of any consent gate the calling client already has: ` +
        `it can lead to a real publish to a live connected account on the pipeline's next tick, so a single call is never sufficient. ` +
        `Step 1: call with just "id" (omit confirmationCode, or pass a wrong/stale one) -- this returns confirmationRequired: true plus a ` +
        `fresh numeric confirmationCode and its expiresAt/expiryMinutes, and makes NO change to the post's status, final copy, or approved_by. ` +
        `Step 2: call again with the SAME "id" and that exact confirmationCode, before it expires (${APPROVAL_CONFIRMATION_CODE_TTL_MINUTES} minutes), ` +
        `to actually approve. A mismatched or expired code on any call is treated identically to step 1: a fresh code is issued and must be ` +
        `used next -- never partially accepted, never reused. Only a call that returns ok: true with no confirmationRequired field has actually ` +
        `approved the post. Does not itself publish -- the pipeline's publish step does that on its next tick, same as the admin UI's Approve action.`,
      inputSchema: {
        id: z.string().describe("social_posts.id"),
        confirmationCode: z
          .string()
          .optional()
          .describe(
            "The code returned by a PRIOR approve_post call for this exact id. Omit on the first call for a post. " +
              "Must exactly match the most recently issued code and be used within its expiry window, or this call " +
              "issues a new code instead of approving (fails closed, whether omitted, wrong, or expired)."
          ),
        finalCopy: z.string().optional().describe("Overwrite the copy that will be published. Only applied on the confirming (second) call."),
        actor: z.string().optional().describe("Who's approving, for the approved_by audit column. Defaults to 'hippo-assist'."),
      },
      outputSchema: {
        ok: z.boolean(),
        confirmationRequired: z.boolean().optional().describe("True when this call did NOT approve the post and instead issued/re-issued a confirmationCode."),
        confirmationCode: z.string().optional().describe("Present only when confirmationRequired is true. Pass this back as confirmationCode on the next call to approve."),
        confirmationExpiresAt: z.string().optional().describe("ISO timestamp the confirmationCode expires at. Present only when confirmationRequired is true."),
        confirmationExpiryMinutes: z.number().optional().describe("How many minutes the confirmationCode is valid for from issuance. Present only when confirmationRequired is true."),
      },
    },
    async ({ id, confirmationCode, finalCopy, actor }) => {
      const confirmation = await resolveApprovalConfirmation(store, id, confirmationCode);
      if (!confirmation.ok) return errorResult(confirmation.error);

      if (!confirmation.confirmed) {
        return jsonResult({
          ok: false,
          confirmationRequired: true,
          confirmationCode: confirmation.code,
          confirmationExpiresAt: confirmation.expiresAt,
          confirmationExpiryMinutes: confirmation.expiryMinutes,
        });
      }

      const result = await applyQueueAction(id, { action: "approve", finalCopy }, actor || "hippo-assist");
      if (!result.ok) return errorResult(result.error);
      return jsonResult({ ok: true });
    }
  );

  server.registerTool(
    "reject_post",
    {
      title: "Reject a queued post",
      description: "Rejects a social_posts row (status -> rejected), with an optional reason -- same as the admin UI's Reject action.",
      inputSchema: {
        id: z.string().describe("social_posts.id"),
        rejectionReason: z.string().optional(),
        actor: z.string().optional().describe("Who's rejecting, for the approved_by audit column. Defaults to 'hippo-assist'."),
      },
      outputSchema: { ok: z.boolean() },
    },
    async ({ id, rejectionReason, actor }) => {
      const result = await applyQueueAction(id, { action: "reject", rejectionReason }, actor || "hippo-assist");
      if (!result.ok) return errorResult(result.error);
      return jsonResult({ ok: true });
    }
  );

  server.registerTool(
    "edit_post",
    {
      title: "Edit a queued post's draft",
      description:
        "Overwrites a social_posts row's draft copy in place (does not change status) -- same as the admin UI's Edit action. Use approve_post afterwards to actually approve it.",
      inputSchema: {
        id: z.string().describe("social_posts.id"),
        draftCopy: z.string().describe("Required -- the replacement draft text."),
        actor: z.string().optional(),
      },
      outputSchema: { ok: z.boolean() },
    },
    async ({ id, draftCopy, actor }) => {
      const result = await applyQueueAction(id, { action: "edit", draftCopy }, actor || "hippo-assist");
      if (!result.ok) return errorResult(result.error);
      return jsonResult({ ok: true });
    }
  );

  // ---------------------------------------------------------------------
  // Signals
  // ---------------------------------------------------------------------

  server.registerTool(
    "inject_signal",
    {
      title: "Inject an operator signal",
      description:
        "Feeds the pipeline a topic idea conversationally -- the same manual operator-signal path social-agent/pipeline/signal-scan.ts's injectOperatorSignal already implements (writes a social_signals row with source='operator', which the Strategist reads exactly like any RSS/GSC signal). Skips LLM scoring; defaults to a high relevance score.",
      inputSchema: {
        keyword: z.string().describe("The topic/keyword to feed the Strategist."),
        note: z.string().optional().describe("Why this is worth posting about."),
        score: z.number().min(1).max(5).optional().describe("1-5, defaults to 5 (operator-curated signals are trusted by default)."),
        accountId: z.string().optional().describe("social_accounts.id. Omit to auto-resolve."),
      },
      outputSchema: {
        id: z.string(),
        account_id: z.string(),
        keyword: z.string(),
        score: z.number(),
      },
    },
    async ({ keyword, note, score, accountId }) => {
      const resolved = await resolveAccountId(store, accountId);
      if (!resolved.ok) return errorResult(resolved.error);

      const signal = await injectOperatorSignal({ accountId: resolved.accountId, store, keyword, note, score });
      return jsonResult({ id: signal.id, account_id: signal.accountId, keyword: signal.keyword, score: signal.score });
    }
  );

  // ---------------------------------------------------------------------
  // Runs / config -- read-only
  // ---------------------------------------------------------------------

  server.registerTool(
    "get_recent_runs",
    {
      title: "Get recent pipeline runs",
      description: "Reads the last N social_runs rows for an account, so Hippo-Assist can answer 'what's the pipeline been doing.' Read-only.",
      inputSchema: {
        accountId: z.string().optional().describe("social_accounts.id. Omit to auto-resolve."),
        limit: z.number().int().min(1).max(100).optional().describe("Defaults to 20."),
      },
      outputSchema: {
        runs: z.array(
          z.object({
            id: z.string(),
            job: z.string(),
            ok: z.boolean(),
            summary: z.record(z.string(), z.unknown()).nullable(),
            created_at: z.string(),
          })
        ),
      },
    },
    async ({ accountId, limit }) => {
      const resolved = await resolveAccountId(store, accountId);
      if (!resolved.ok) return errorResult(resolved.error);

      const runs = await getRecentRuns(store, resolved.accountId, limit ?? 20);
      return jsonResult({
        runs: runs.map((run) => ({ id: run.id, job: run.job, ok: run.ok, summary: run.summary, created_at: run.createdAt })),
      });
    }
  );

  server.registerTool(
    "get_guardrail_config",
    {
      title: "Get guardrail configuration",
      description:
        "Reports the pipeline's actual safety-threshold constants (max revision passes, daily OpenRouter spend cap, minimum signal score to start drafting) so Hippo-Assist can explain them. Read-only, by design -- there is no corresponding write tool: these are the real safety mechanism, not tone, and changing them stays a code change.",
      inputSchema: {},
      outputSchema: {
        maxRevisionPasses: z.number(),
        dailyOpenRouterSpendCapUsd: z.number(),
        minSignalScoreToDraft: z.number(),
      },
    },
    async () => jsonResult(getGuardrailConfig())
  );

  // ---------------------------------------------------------------------
  // Resources -- readable context documents, distinct from the callable
  // tools above (see docs/decisions/social-mcp-resources.md). Content-
  // building logic lives in social-agent/mcp/resources.ts (portable,
  // Store-port-only); these callbacks are the host-glue wiring, reusing
  // the exact same helpers the tools above already call.
  // ---------------------------------------------------------------------

  server.registerResource(
    "brand-profile",
    "social://brand-profile",
    {
      title: "Brand profile",
      description:
        "The current brand voice/tone/expectations -- same underlying data as the get_brand_profile tool, framed as a document to pull in as standing context rather than a tool to call with arguments.",
      mimeType: "application/json",
    },
    async (uri) => {
      const resolved = await resolveAccountId(store);
      const content = resolved.ok
        ? buildBrandProfileResource(await getBrandProfile(store, resolved.accountId), resolved.accountId)
        : { found: false, error: resolved.error };

      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(content, null, 2) }],
      };
    }
  );

  server.registerResource(
    "guardrail-rules",
    "social://guardrail-rules",
    {
      title: "Guardrail decision engine, explained",
      description:
        "A prose explanation of the actual priority-ordered rules social-agent/pipeline/guardrail.ts's decideGuardrailOutcome enforces (disclosure hard-gate, accuracy/policy reject threshold, budget check, escalate routing, remaining-dimension revise check), with the live numeric thresholds interpolated in -- distinct from get_guardrail_config, which reports the raw numbers without the reasoning.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: buildGuardrailRulesResource(getGuardrailConfig()) }],
    })
  );

  server.registerResource(
    "operating-scope",
    "social://operating-scope",
    {
      title: "Operating scope",
      description:
        "The actual boundary of what Hippo-Assist can and cannot do through this MCP server -- which actions take effect immediately, which one can trigger a real publish, and what's a deliberate code-only boundary this surface cannot touch.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: buildOperatingScopeResource() }],
    })
  );

  return server;
}

function jsonResult(structuredContent: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!isAuthorizedSocialMcpRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = buildServer();
  // `enableJsonResponse: true` -- this server's tools are all plain
  // request/response calls (no sampling, elicitation, or long-running
  // tasks that need server-initiated notifications), so there's nothing
  // that needs an SSE stream. A buffered JSON response is also the better
  // fit for a stateless serverless function: `transport.handleRequest`'s
  // returned Response is fully formed by the time it resolves, so closing
  // the transport/server right after (below) is safe -- with SSE instead,
  // the Response wraps a stream that's still being written when
  // `handleRequest` resolves, and closing immediately after would cut it
  // off before any data reached the client (confirmed by hand against a
  // running instance while building this route, not assumed).
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}
