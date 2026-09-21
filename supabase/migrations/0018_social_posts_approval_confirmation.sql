-- Defense-in-depth for the MCP server's `approve_post` tool
-- (app/api/mcp/social/route.ts): a two-step confirmation scoped ONLY to
-- that tool, so the server itself never treats a single tool invocation as
-- sufficient to trigger a real publish, independent of whatever consent
-- gate the calling MCP client (Hippo-Assist) has on its own side. See
-- docs/decisions/mcp-approve-post-confirmation.md for the full design.
--
-- Two nullable columns on social_posts, following this table's own
-- existing per-row-workflow-state convention (approved_by, rejection_reason,
-- edited_before_approval -- all nullable/defaulted columns on this same
-- table rather than a separate table, since this is scoped to a single row's
-- in-flight approval, not a new entity). Both columns are cleared (set back
-- to null) the moment a confirmation succeeds, or superseded by a fresh
-- code/expiry the moment a call fails to confirm -- so at rest, a non-null
-- value here always means "a confirmation is currently outstanding for this
-- post," never a permanent audit record (approved_by already serves that
-- purpose after a successful approval).
--
-- Does NOT touch app/api/admin/social/queue/[id]/route.ts's PATCH handler or
-- queue-shared.ts's applyQueueAction -- the browser admin UI's Approve
-- action never reads or writes these columns, by design (its own gate is a
-- logged-in human clicking a button, already sufficient on its own).
--
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query >
-- paste > Run). NOT applied by this commit -- see the build report for
-- verification steps once it's run.

alter table social_posts
  add column if not exists approval_confirmation_code text,
  add column if not exists approval_confirmation_expires_at timestamptz;
