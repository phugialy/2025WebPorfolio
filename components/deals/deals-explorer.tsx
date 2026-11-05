"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { SECTIONS, filterExplorer, type ExplorerItem, type ExplorerSort } from "@/lib/deals-core";

const PAGE_SIZE = 12;

// Search, filter and sort the whole catalog in the browser. All the data comes
// in with the page, so typing never calls the server or the database.
export function DealsExplorer({ items }: { items: ExplorerItem[] }) {
  const searchId = useId();
  const sortId = useId();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [sort, setSort] = useState<ExplorerSort>("trending");
  const [shown, setShown] = useState(PAGE_SIZE);

  const present = useMemo(() => new Set(items.map((i) => i.section)), [items]);
  const chips = useMemo(
    () => [
      { slug: "all", title: "All" },
      ...SECTIONS.filter((s) => present.has(s.slug)).map((s) => ({ slug: s.slug, title: s.title })),
      ...(present.has("more") ? [{ slug: "more", title: "More picks" }] : []),
    ],
    [present]
  );
  const results = useMemo(() => filterExplorer(items, { query, section, sort }), [items, query, section, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder="Search mini PC, keyboard, book..."
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-sm text-muted-foreground">
            Sort
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as ExplorerSort);
              setShown(PAGE_SIZE);
            }}
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="trending">Trending now</option>
            <option value="name">Name A to Z</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {chips.map((chip) => (
          <button
            key={chip.slug}
            type="button"
            onClick={() => {
              setSection(chip.slug);
              setShown(PAGE_SIZE);
            }}
            aria-pressed={section === chip.slug}
            className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              section === chip.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/60"
            }`}
          >
            {chip.title}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
        {results.length} {results.length === 1 ? "product" : "products"}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nothing matches that search.{" "}
          <button
            type="button"
            className="font-medium text-primary underline underline-offset-2"
            onClick={() => {
              setQuery("");
              setSection("all");
              setShown(PAGE_SIZE);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.slice(0, shown).map((item) => (
              <DealsProductCard key={item.id} product={item} refSlug="search" />
            ))}
          </div>
          {results.length > shown && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="min-h-11 rounded-md border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Show {Math.min(PAGE_SIZE, results.length - shown)} more ({results.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
