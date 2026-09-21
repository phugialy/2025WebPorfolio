import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseStore } from "@/app/social-agent-adapters/store";
import { resolveAccountId } from "@/social-agent/mcp/resolve-account";
import { getBrandProfile, updateBrandProfile, type BrandProfilePatch } from "@/social-agent/mcp/brand-profile";
import { buildBrandProfileResource } from "@/social-agent/mcp/resources";

// Editable brand-profile settings for the admin UI
// (app/admin/social/settings/settings-board.tsx). Auth-gated the same way
// as app/api/admin/social/queue/route.ts -- requireAdminSession(), a
// browser-UI Google-session gate, NOT the MCP server's bearer-token auth
// (app/api/mcp/social/auth.ts's isAuthorizedSocialMcpRequest, used only by
// the Hippo-Assist-facing route).
//
// CRITICAL, per the parent task's explicit instruction: GET/PATCH here call
// the exact same getBrandProfile / updateBrandProfile functions from
// social-agent/mcp/brand-profile.ts that app/api/mcp/social/route.ts's
// get_brand_profile / update_brand_profile MCP tools already call -- this
// is the THIRD caller of that shared logic (the MCP tools and the
// social://brand-profile resource are the other two), never a
// reimplementation of brand-profile read/write. Same "shared, not
// duplicated" discipline already applied to the approval queue's
// approve/reject/edit actions via app/api/mcp/social/queue-shared.ts's
// applyQueueAction (that file's own header comment states this precedent).
//
// GUARDRAIL BOUNDARY, restated for this surface: this route has NO field,
// no request-body key, and no code path anywhere below that reads or
// writes MAX_REVISION_PASSES, DAILY_OPENROUTER_SPEND_CAP_USD, or
// MIN_SIGNAL_SCORE_TO_DRAFT (social-agent/pipeline/guardrail.ts,
// social-agent/reliability/watchdog.ts, app/api/cron/social-pipeline/
// route.ts respectively). PATCH's request-body type (`PatchBody` below)
// only declares the four brand-profile fields -- there is no way to reach
// those three constants through this route, by construction, not by
// omission from a UI form alone. Same reasoning as
// app/api/mcp/social/guardrail-config.ts's `get_guardrail_config` tool:
// these numbers are the actual safety mechanism (the disclosure hard
// gate's revision cap, the runaway-cost circuit breaker), not "tone," and
// changing them stays a code change + review.

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isMissingRelationError(error: unknown): boolean {
  return error instanceof Error && /relation .* does not exist/i.test(error.message);
}

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const store = createSupabaseStore();

  try {
    const resolved = await resolveAccountId(store);
    if (!resolved.ok) {
      // No account yet (pre-Phase-1 provisioning, or an ambiguous
      // multi-account state) -- the form still renders, just empty and
      // unsaved-able until an account exists. Same "don't guess" posture
      // resolveAccountId itself documents.
      return NextResponse.json({ found: false, accountError: resolved.error });
    }

    const profile = await getBrandProfile(store, resolved.accountId);
    return NextResponse.json(buildBrandProfileResource(profile, resolved.accountId));
  } catch (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({ found: false, migrationPending: true });
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

type PatchBody = {
  voice_description?: string;
  tone_guidelines?: string[];
  banned_topics?: string[];
  disclosure_template?: string;
};

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json().catch(() => ({}))) as PatchBody;

  // Only these four fields are ever read off the body -- see the file
  // header for why this is the actual mechanism (not just UI omission)
  // that keeps guardrail thresholds unreachable through this route.
  const patch: BrandProfilePatch = {
    ...(body.voice_description !== undefined ? { voice: body.voice_description } : {}),
    ...(body.tone_guidelines !== undefined ? { toneRules: body.tone_guidelines } : {}),
    ...(body.banned_topics !== undefined ? { bannedTopics: body.banned_topics } : {}),
    ...(body.disclosure_template !== undefined ? { disclosureTemplate: body.disclosure_template } : {}),
  };

  const store = createSupabaseStore();

  try {
    const resolved = await resolveAccountId(store);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 409 });
    }

    const updated = await updateBrandProfile(store, resolved.accountId, patch);
    return NextResponse.json(buildBrandProfileResource(updated, resolved.accountId));
  } catch (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        { error: "The social_accounts/social_brand_profile tables aren't set up yet.", migrationPending: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
