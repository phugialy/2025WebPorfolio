import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Shared queue-read/queue-action logic for the social-agent approval queue,
// used by BOTH app/api/admin/social/queue/[id]/route.ts's PATCH handler
// (the admin-UI path) and app/api/mcp/social/route.ts's `list_queue` /
// `approve_post` / `reject_post` / `edit_post` MCP tools (the Hippo-Assist
// path). Extracted here rather than duplicated, per the MCP build task's
// instruction to share this logic where the refactor is clean.
//
// `listGuardrailPendingQueue` intentionally duplicates (does not import
// from) app/api/admin/social/queue/route.ts's own GET handler -- that file
// is off-limits to edit for this task, and it doesn't export its query
// logic separately, so there's nothing importable there without touching
// it. This function is written to match that route's select/order/error-
// handling shape exactly (see its own comments for why: draft_copy/
// final_copy/guardrail_verdict are ALIASES onto the real draft_text/
// final_text/guardrail_review columns, kept so the admin UI's existing
// field names need no changes).
//
// The Supabase client type is threaded through loosely (not the full
// generated `SupabaseClient<Database>` type) for the same reason
// app/social-agent-adapters/store.ts's own `applyFilters` helper does --
// the PostgrestFilterBuilder's type shape changes after every chained call,
// so precisely typing a small, self-contained query helper isn't worth
// reimplementing part of supabase-js's own type surface for. Accepting an
// optional client here (defaulting to a real one) is what makes both
// functions testable against a fake client with no live database.

// Postgres "relation does not exist" -- expected until Phase 0's
// social_posts migration is applied. Treat it as an empty queue rather than
// a hard failure so a caller still gets a sane empty state.
const RELATION_DOES_NOT_EXIST = "42P01";

export type QueuePost = {
  id: string;
  account_id: string;
  platform: string;
  status: string;
  draft_copy: string | null;
  final_copy: string | null;
  guardrail_verdict: unknown;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type ListQueueResult =
  | { ok: true; posts: QueuePost[]; migrationPending?: boolean }
  | { ok: false; error: string; status: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function listGuardrailPendingQueue(
  client: SupabaseLike | null = createSupabaseAdminClient()
): Promise<ListQueueResult> {
  if (!client) {
    return { ok: false, error: "Supabase admin client is not configured.", status: 500 };
  }

  try {
    const { data, error } = await client
      .from("social_posts")
      .select(
        "id, account_id, platform, status, draft_copy:draft_text, final_copy:final_text, guardrail_verdict:guardrail_review, approved_by, rejection_reason, created_at"
      )
      .eq("status", "guardrail_pending")
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code === RELATION_DOES_NOT_EXIST) {
        return { ok: true, posts: [], migrationPending: true };
      }
      throw error;
    }

    return { ok: true, posts: (data as QueuePost[]) || [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message, status: 500 };
  }
}

export type QueueAction = "approve" | "reject" | "edit";

export type QueueActionInput = {
  action: QueueAction;
  finalCopy?: string;
  rejectionReason?: string;
  draftCopy?: string;
};

export type QueueActionResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Applies one of the three queue actions to `social_posts` row `id` --
 * verbatim the same patches app/api/admin/social/queue/[id]/route.ts's PATCH
 * handler writes (approve: status=approved [+ final_text], reject:
 * status=rejected [+ rejection_reason], edit: draft_text). `actor` is
 * recorded as `approved_by` on approve/reject, same column the admin route
 * writes the logged-in admin's email into -- callers here (the MCP tool
 * handler) pass whatever identifies the actual human behind the Hippo-
 * Assist conversation, or a fallback label when that isn't known.
 */
export async function applyQueueAction(
  id: string,
  input: QueueActionInput,
  actor: string,
  client: SupabaseLike | null = createSupabaseAdminClient()
): Promise<QueueActionResult> {
  if (!client) {
    return { ok: false, error: "Supabase admin client is not configured.", status: 500 };
  }

  let patch: Record<string, unknown>;
  if (input.action === "approve") {
    patch = {
      status: "approved",
      approved_by: actor,
      ...(input.finalCopy ? { final_text: input.finalCopy } : {}),
    };
  } else if (input.action === "reject") {
    patch = {
      status: "rejected",
      rejection_reason: input.rejectionReason || null,
      approved_by: actor,
    };
  } else {
    if (!input.draftCopy || !input.draftCopy.trim()) {
      return { ok: false, error: "draftCopy is required for the edit action", status: 400 };
    }
    patch = { draft_text: input.draftCopy };
  }

  try {
    const { error } = await client.from("social_posts").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message, status: 500 };
  }
}
