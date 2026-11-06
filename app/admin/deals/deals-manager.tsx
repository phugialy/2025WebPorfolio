"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { DEALS_CATALOG_TAGS, humanizeTag, type ManagerRow } from "@/lib/deals-core";
import { DealsStatsPanel } from "./deals-stats-panel";

type Filter = "all" | "shown" | "hidden" | "overridden";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "shown", label: "On the page" },
  { key: "hidden", label: "Hidden" },
  { key: "overridden", label: "Changed by hand" },
];

// Every product that appears on the Deals pages automatically, with the few
// things worth overriding: show or hide it, pin it to the top, and choose which
// tabs and holiday lists it belongs to. A saved change is live straight away.
export function DealsManager() {
  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [catalogReady, setCatalogReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/deals", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not load the Deals products.");
      setRows(json.rows);
      setCatalogReady(json.catalogReady);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the Deals products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/deals/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not save.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSavingId(null);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "shown" && r.hidden) return false;
      if (filter === "hidden" && !r.hidden) return false;
      if (filter === "overridden" && !r.overridden) return false;
      return !q || `${r.name} ${r.category ?? ""}`.toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  const shownCount = rows.filter((r) => !r.hidden).length;

  return (
    <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <AdminAffiliateTabs active="deals" />
        <h1 className="text-2xl font-semibold tracking-tight">Deals products</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          New affiliate products show up on the Deals pages on their own, tagged from their category. Use this screen only to
          override one: hide it, pin it, or change where it appears. Changes go live as soon as you save.
        </p>
      </div>

      <DealsStatsPanel />

      {!catalogReady && (
        <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          The deals_catalog table does not exist yet, so edits cannot be saved. Run
          supabase/migrations/0023_deals_catalog.sql in the Supabase SQL Editor, then reload.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter products" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm sm:w-64">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="min-h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {loading ? "Loading..." : `${shownCount} of ${rows.length} products are on the Deals pages. Showing ${visible.length}.`}
      </p>

      <ul className="flex flex-col gap-3">
        {visible.map((row) => {
          const busy = savingId === row.id;
          return (
            <li
              key={row.id}
              data-testid="deals-manager-row"
              className={`flex flex-col gap-3 rounded-xl border border-border bg-card p-4 ${row.hidden ? "opacity-70" : ""}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.category ?? "No category"}
                    {row.overridden ? " · changed by hand" : " · automatic"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <span>Pin to top</span>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      defaultValue={row.pinned_rank ?? ""}
                      key={`${row.id}-${row.pinned_rank ?? "none"}`}
                      disabled={busy || !catalogReady}
                      placeholder="rank"
                      aria-label={`Pin rank for ${row.name}`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const next = raw === "" ? null : Number(raw);
                        if (next === row.pinned_rank) return;
                        void send(row.id, "PATCH", { pinned_rank: next });
                      }}
                      className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !catalogReady}
                    onClick={() => void send(row.id, "PATCH", { hidden: !row.hidden })}
                    className="inline-flex min-h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {row.hidden ? "Show on Deals" : "Hide from Deals"}
                  </button>
                  {row.overridden && (
                    <button
                      type="button"
                      disabled={busy || !catalogReady}
                      onClick={() => void send(row.id, "DELETE")}
                      className="inline-flex min-h-9 items-center rounded-md px-3 text-sm text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      Back to automatic
                    </button>
                  )}
                </div>
              </div>
              <div role="group" aria-label={`Tags for ${row.name}`} className="flex flex-wrap gap-2">
                {DEALS_CATALOG_TAGS.map((tag) => {
                  const on = row.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      disabled={busy || !catalogReady}
                      onClick={() => void send(row.id, "PATCH", { tags: on ? row.tags.filter((t) => t !== tag) : [...row.tags, tag] })}
                      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                        on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      {humanizeTag(tag)}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
