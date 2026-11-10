// An in-memory stand-in for the Supabase client, for integration tests of the
// cron jobs and anything else that talks to the database. It is deliberately
// strict in the places where a mock that always says yes hides real bugs:
//
//   - A JSON column (declared in `jsonColumns`) rejects the Postgres-array form
//     of `.contains()`, with the real error text. The guide-link bug (shipped
//     once, "invalid input syntax for type json") would fail a test here.
//   - A table with declared `columns` rejects selecting a column that does not
//     exist, like Postgres does.
//   - `.single()` errors on zero rows; `.maybeSingle()` returns null.
//   - Every write is logged in `writes`, so a test can assert that a dry run
//     wrote nothing.
//
// Not a Postgres: it supports exactly the query methods this codebase uses
// (eq, neq, is, in, gte, lte, ilike, contains, filter/not with "cs", order,
// limit, range, single, maybeSingle, insert, update, upsert, delete).

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string; code?: string } | null };

export type FakeDbInit = {
  tables?: Record<string, Row[]>;
  /** Columns stored as JSON (jsonb). `.contains()` with an array on these is a Postgres error. */
  jsonColumns?: Record<string, string[]>;
  /** If set for a table, selecting any other column is an error. */
  columns?: Record<string, string[]>;
  /** Make every read or write on a table fail with this message. */
  failOn?: Record<string, string>;
};

export type WriteLog = { table: string; op: "insert" | "update" | "upsert" | "delete"; payload?: unknown };

export type FakeSupabase = {
  from(table: string): Query;
  tables: Record<string, Row[]>;
  writes: WriteLog[];
};

let idCounter = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`;

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row[] = [];
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private predicates: ((row: Row) => boolean)[] = [];
  private errors: { message: string; code?: string }[] = [];
  private orderBys: { col: string; ascending: boolean }[] = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private returning = false;
  private selectCols: string | undefined;

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
    private readonly init: FakeDbInit
  ) {}

  private isJson(col: string) {
    return (this.init.jsonColumns?.[this.table] ?? []).includes(col);
  }

  select(cols?: string) {
    this.returning = true;
    this.selectCols = cols;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = [values];
    return this;
  }
  upsert(rows: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.upsertOptions = options;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.predicates.push((r) => r[col] === val);
    return this;
  }
  neq(col: string, val: unknown) {
    this.predicates.push((r) => r[col] !== val);
    return this;
  }
  is(col: string, val: unknown) {
    this.predicates.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.predicates.push((r) => vals.includes(r[col]));
    return this;
  }
  gte(col: string, val: unknown) {
    this.predicates.push((r) => (r[col] as string | number) >= (val as string | number));
    return this;
  }
  lte(col: string, val: unknown) {
    this.predicates.push((r) => (r[col] as string | number) <= (val as string | number));
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = likeToRegExp(pattern);
    this.predicates.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
    return this;
  }

  /** `.contains(col, [..])` sends a Postgres array literal. On a JSON column that is an error. */
  contains(col: string, val: unknown[]) {
    if (this.isJson(col)) {
      this.errors.push({ code: "22P02", message: "invalid input syntax for type json" });
      return this;
    }
    this.predicates.push((r) => Array.isArray(r[col]) && val.every((v) => (r[col] as unknown[]).includes(v)));
    return this;
  }

  /** `.filter(col, "cs", value)`: on a JSON column the value must be JSON text, like '["x"]'. */
  filter(col: string, op: string, val: string) {
    return this.applyFilter(col, op, val, false);
  }
  not(col: string, op: string, val: string) {
    return this.applyFilter(col, op, val, true);
  }
  private applyFilter(col: string, op: string, val: string, negate: boolean) {
    if (op !== "cs") throw new Error(`fake-supabase: filter operator "${op}" is not supported`);
    let wanted: unknown[];
    if (this.isJson(col)) {
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        wanted = parsed;
      } catch {
        this.errors.push({ code: "22P02", message: "invalid input syntax for type json" });
        return this;
      }
    } else {
      wanted = val.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
    }
    this.predicates.push((r) => {
      const has = Array.isArray(r[col]) && wanted.every((w) => (r[col] as unknown[]).includes(w));
      return negate ? !has : has;
    });
    return this;
  }

  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBys.push({ col, ascending: opts.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): Result {
    const failure = this.init.failOn?.[this.table];
    if (failure) return { data: null, error: { message: failure } };
    if (this.errors.length) return { data: null, error: this.errors[0] };

    // Selecting a column the table does not have is an error in Postgres.
    const known = this.init.columns?.[this.table];
    if (known && this.selectCols) {
      const asked = this.selectCols
        .replace(/\w+\([^)]*\)/g, "")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c && c !== "*");
      const missing = asked.find((c) => !known.includes(c));
      if (missing) return { data: null, error: { code: "42703", message: `column ${this.table}.${missing} does not exist` } };
    }

    const rows = (this.db.tables[this.table] ??= []);
    const matches = () => rows.filter((r) => this.predicates.every((p) => p(r)));

    let affected: Row[];
    if (this.op === "insert") {
      affected = this.payload.map((p) => ({ id: nextId(), created_at: new Date().toISOString(), ...p }));
      rows.push(...affected);
      this.db.writes.push({ table: this.table, op: "insert", payload: this.payload });
    } else if (this.op === "upsert") {
      const keys = (this.upsertOptions.onConflict ?? "id").split(",").map((k) => k.trim());
      affected = [];
      for (const p of this.payload) {
        const existing = rows.find((r) => keys.every((k) => r[k] === p[k]));
        if (existing) {
          if (!this.upsertOptions.ignoreDuplicates) Object.assign(existing, p);
        } else {
          const row = { id: nextId(), created_at: new Date().toISOString(), ...p };
          rows.push(row);
          affected.push(row);
        }
      }
      this.db.writes.push({ table: this.table, op: "upsert", payload: this.payload });
    } else if (this.op === "update") {
      affected = matches();
      for (const r of affected) Object.assign(r, this.payload[0]);
      this.db.writes.push({ table: this.table, op: "update", payload: this.payload[0] });
    } else if (this.op === "delete") {
      affected = matches();
      this.db.tables[this.table] = rows.filter((r) => !affected.includes(r));
      this.db.writes.push({ table: this.table, op: "delete" });
    } else {
      affected = matches();
    }

    if ((this.op === "insert" || this.op === "update" || this.op === "upsert" || this.op === "delete") && !this.returning) {
      return { data: null, error: null };
    }

    let out = affected.map((r) => ({ ...r }));
    for (const { col, ascending } of [...this.orderBys].reverse()) {
      out.sort((a, b) => {
        const x = a[col] as string | number | null;
        const y = b[col] as string | number | null;
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (this.rangeFrom !== null && this.rangeTo !== null) out = out.slice(this.rangeFrom, this.rangeTo + 1);
    if (this.limitN !== null) out = out.slice(0, this.limitN);

    if (this.mode === "single") {
      return out.length === 1
        ? { data: out[0], error: null }
        : { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
}

export function createFakeSupabase(init: FakeDbInit = {}): FakeSupabase {
  const db: FakeSupabase = {
    tables: Object.fromEntries(Object.entries(init.tables ?? {}).map(([k, v]) => [k, v.map((r) => ({ ...r }))])),
    writes: [],
    from(table: string) {
      return new Query(db, table, init);
    },
  };
  return db;
}

/** The columns this app stores as JSON. Mirrors the real schema. */
export const REAL_JSON_COLUMNS = { articles: ["tags"] };
