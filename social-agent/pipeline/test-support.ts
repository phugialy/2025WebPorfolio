// Shared test doubles for Phase 2's unit tests. Deliberately lives beside
// the pipeline code (not under a top-level tests/ dir) since it only
// implements ports.ts's interfaces with no external dependencies -- exactly
// what the task asked for: "test against a mock/in-memory Store and mock
// LLM, not a live Supabase connection."
//
// Not imported by any non-test file.

import type { LLM, LLMResult, Message, Query, Store } from "../ports";

type Row = { id: string; [key: string]: unknown };

/** Minimal in-memory implementation of the Store port, enough to exercise every query shape Phase 2's pipeline code actually uses (eq filters, orderBy, limit). */
export class InMemoryStore implements Store {
  private collections = new Map<string, Row[]>();

  seed<T extends Row>(collection: string, rows: T[]): void {
    this.collections.set(collection, [...(this.collections.get(collection) ?? []), ...rows]);
  }

  dump<T = Row>(collection: string): T[] {
    return [...(this.collections.get(collection) ?? [])] as T[];
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const rows = this.collections.get(collection) ?? [];
    const found = rows.find((r) => r.id === id);
    return (found as T) ?? null;
  }

  async list<T>(collection: string, query: Query): Promise<T[]> {
    let rows = [...(this.collections.get(collection) ?? [])];

    for (const filter of query.filters ?? []) {
      rows = rows.filter((row) => matchesFilter(row[filter.field], filter.op, filter.value));
    }

    if (query.orderBy) {
      const { field, direction = "asc" } = query.orderBy;
      rows.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv) return 0;
        const cmp = av! > bv! ? 1 : -1;
        return direction === "asc" ? cmp : -cmp;
      });
    }

    if (typeof query.limit === "number") {
      rows = rows.slice(0, query.limit);
    }

    return rows as T[];
  }

  async insert<T>(collection: string, row: T): Promise<T> {
    const rows = this.collections.get(collection) ?? [];
    rows.push(row as unknown as Row);
    this.collections.set(collection, rows);
    return row;
  }

  async update<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
    const rows = this.collections.get(collection) ?? [];
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`InMemoryStore.update: no row with id "${id}" in "${collection}"`);
    rows[index] = { ...rows[index], ...patch } as Row;
    return rows[index] as T;
  }
}

function matchesFilter(actual: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return (actual as number) > (expected as number);
    case "gte":
      return (actual as number) >= (expected as number);
    case "lt":
      return (actual as number) < (expected as number);
    case "lte":
      return (actual as number) <= (expected as number);
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    default:
      return false;
  }
}

/**
 * A scriptable mock LLM. Each call to `generateText` returns the next entry
 * in `responses` (as JSON.stringify'd content if given an object, or the
 * string as-is). Every call is recorded in `.calls` for assertions. Running
 * out of scripted responses throws, deliberately, so a test can't silently
 * pass on an untested call path.
 */
export function createScriptedLLM(responses: Array<string | object>): LLM & { calls: Message[][] } {
  const queue = [...responses];
  const calls: Message[][] = [];

  return {
    calls,
    async generateText(messages: Message[]): Promise<LLMResult> {
      calls.push(messages);
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("createScriptedLLM: ran out of scripted responses");
      }
      const content = typeof next === "string" ? next : JSON.stringify(next);
      return { content };
    },
  };
}
