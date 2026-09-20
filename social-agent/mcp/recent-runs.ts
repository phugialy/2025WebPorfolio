// Read-only `social_runs` history for the social-agent MCP server's
// `get_recent_runs` tool -- lets Hippo-Assist answer "what's the pipeline
// been doing" conversationally.
//
// Deliberately NOT reusing reliability/watchdog.ts's own `SocialRunRow`
// type: that type declares snake_case fields (`account_id`, `created_at`)
// but is read through the same `Store.list` used here, which returns
// CAMEL-CASE fields (via app/social-agent-adapters/store.ts's
// `columnsToRow` -- `account_id` -> `accountId`, `created_at` -> `createdAt`,
// with no explicit alias for either, so the mechanical toCamelCase
// conversion applies). Copying watchdog.ts's row type here would just
// reproduce a field-name mismatch against what Store actually hands back,
// so this file defines its own, correctly-cased local type instead. (This
// mismatch also affects watchdog.ts itself, which is out of this task's
// scope to fix -- see the MCP build's report.)
//
// Portable: depends only on the Store port, per social-agent/README.md's
// boundary rule.

import type { Store } from "../ports";

/** `social_runs` row, as `Store.list` actually returns it (camelCase). */
export type RecentRun = {
  id: string;
  accountId: string;
  job: string;
  ok: boolean;
  summary: Record<string, unknown> | null;
  createdAt: string;
};

export async function getRecentRuns(store: Store, accountId: string, limit = 20): Promise<RecentRun[]> {
  return store.list<RecentRun>("social_runs", {
    filters: [{ field: "accountId", op: "eq", value: accountId }],
    orderBy: { field: "createdAt", direction: "desc" },
    limit,
  });
}
