import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Query, QueryFilter, Store } from "@/social-agent/ports";

// Supabase-backed implementation of the `Store` port (social-agent/ports.ts).
// Host glue only -- no pipeline/business logic belongs here. Mirrors the
// existing createSupabaseAdminClient() pattern lib/cron-log.ts and
// lib/market-intelligence.ts already use; the difference is this is the
// ONLY file in the social-agent feature allowed to import
// `@supabase/supabase-js` (via lib/supabase/server.ts) -- everything on
// the social-agent/ side of the port only ever sees the `Store` interface,
// per social-agent/README.md's boundary rule.
//
// Every social_* table this reads/writes is service-role-only (RLS with no
// public policy, same as cron_runs and every other admin-only table in
// this project) -- see supabase/migrations/0017_social_agent_foundation.sql.

// Naming translation, added after a real mismatch was found and verified
// post-hoc: pipeline code (social-agent/pipeline/*) uses camelCase field
// names on purpose -- the whole point of the Store port is that pipeline
// code shouldn't need to know or care what a column is actually called in
// Postgres. The previous version of this file forwarded row keys straight
// through unchanged, which happened to work for accidentally-matching
// names (accountId/account_id) and silently broke for everything that
// wasn't a pure-casing difference (draftCopy vs. draft_text,
// guardrailVerdict vs. guardrail_review, scheduledAt vs. scheduled_for).
// This is the one file responsible for that translation -- nowhere else in
// social-agent/ should ever need to know a real column name.
//
// Most fields translate mechanically (camelCase -> snake_case and back);
// the handful that don't share a root word with their column are listed
// explicitly below so the mapping is auditable in one place rather than
// guessed at per call site.
const FIELD_ALIASES: Record<string, string> = {
  draftCopy: "draft_text",
  finalCopy: "final_text",
  guardrailVerdict: "guardrail_review",
  draftDisclosurePresent: "disclosure_present",
  scheduledAt: "scheduled_for",
  score: "relevance_score",
  raw: "raw_payload",
  voice: "voice_description",
  toneRules: "tone_guidelines",
};

const REVERSE_FIELD_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([jsKey, column]) => [column, jsKey])
);

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/** JS/TS field name (as pipeline code writes it) -> real Postgres column name. Exported for direct unit testing -- this mapping is the entire point of this file, and is easy to get subtly wrong (a one-directional alias, a forgotten reverse-lookup) without a dedicated test on the pure logic itself. */
export function jsFieldToColumn(field: string): string {
  return FIELD_ALIASES[field] ?? toSnakeCase(field);
}

/** Real Postgres column name -> JS/TS field name (as pipeline code expects to read it). */
export function columnToJsField(column: string): string {
  return REVERSE_FIELD_ALIASES[column] ?? toCamelCase(column);
}

// Only top-level keys are translated -- a row's jsonb columns (brief,
// guardrail_review, raw_payload, pending_diff, ...) hold whole objects that
// pipeline code already defined with their own consistent camelCase shape
// (e.g. ContentBrief, SocialGuardrailReview). JSON round-trips those object
// keys byte-for-byte regardless of casing, and Postgres itself doesn't
// care about jsonb-internal key casing -- only the column name wrapping
// the blob needs translating, never its contents. Recursing into values
// would be both unnecessary and wrong (it would mangle keys the pipeline
// never asked to have renamed).
export function rowToColumns<T extends object>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[jsFieldToColumn(key)] = value;
  }
  return out;
}

export function columnsToRow<T>(data: Record<string, unknown> | null): T | null {
  if (!data) return null;
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(data)) {
    out[columnToJsField(column)] = value;
  }
  return out as T;
}

// Supabase's PostgrestFilterBuilder type changes shape after every
// chained call (.eq(), .gt(), ...), so a generic "apply N unknown filters
// in a loop" helper can't stay precisely typed without reimplementing
// part of the supabase-js type surface. Scoped to this one helper, not
// exported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: QueryFilter[] | undefined) {
  if (!filters) return query;

  for (const filter of filters) {
    const column = jsFieldToColumn(filter.field);
    switch (filter.op) {
      case "eq":
        query = query.eq(column, filter.value);
        break;
      case "neq":
        query = query.neq(column, filter.value);
        break;
      case "gt":
        query = query.gt(column, filter.value);
        break;
      case "gte":
        query = query.gte(column, filter.value);
        break;
      case "lt":
        query = query.lt(column, filter.value);
        break;
      case "lte":
        query = query.lte(column, filter.value);
        break;
      case "in":
        query = query.in(column, filter.value as unknown[]);
        break;
    }
  }

  return query;
}

export function createSupabaseStore(): Store {
  return {
    async get<T>(collection: string, id: string): Promise<T | null> {
      const supabase = createSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase write config is missing");
      }

      const { data, error } = await supabase.from(collection).select("*").eq("id", id).maybeSingle();
      if (error) {
        throw new Error(`Store.get(${collection}, ${id}) failed: ${error.message}`);
      }

      return columnsToRow<T>(data as Record<string, unknown> | null);
    },

    async list<T>(collection: string, query: Query): Promise<T[]> {
      const supabase = createSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase write config is missing");
      }

      let builder = applyFilters(supabase.from(collection).select("*"), query.filters);
      if (query.orderBy) {
        builder = builder.order(jsFieldToColumn(query.orderBy.field), {
          ascending: query.orderBy.direction !== "desc",
        });
      }
      if (query.limit) {
        builder = builder.limit(query.limit);
      }

      const { data, error } = await builder;
      if (error) {
        throw new Error(`Store.list(${collection}) failed: ${error.message}`);
      }

      return ((data ?? []) as Record<string, unknown>[]).map((row) => columnsToRow<T>(row) as T);
    },

    async insert<T>(collection: string, row: T): Promise<T> {
      const supabase = createSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase write config is missing");
      }

      const { data, error } = await supabase
        .from(collection)
        .insert(rowToColumns(row as object))
        .select()
        .single();

      if (error) {
        throw new Error(`Store.insert(${collection}) failed: ${error.message}`);
      }

      return columnsToRow<T>(data as Record<string, unknown>) as T;
    },

    async update<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
      const supabase = createSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase write config is missing");
      }

      const { data, error } = await supabase
        .from(collection)
        .update(rowToColumns(patch as object))
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Store.update(${collection}, ${id}) failed: ${error.message}`);
      }

      return columnsToRow<T>(data as Record<string, unknown>) as T;
    },
  };
}
