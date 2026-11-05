"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import {
  CATALOG_PAGE_SIZE,
  itemsForTab,
  paginate,
  visibleTabs,
  type ExplorerItem,
} from "@/lib/deals-core";

// The catalog grid: a tab per category or holiday, search, and 10 products a
// page (at most 3 pages a tab). All the data arrives with the page, so tabs,
// search and paging never call the server or the database.
export function DealsCatalog({ items }: { items: ExplorerItem[] }) {
  const searchId = useId();
  const top = useRef<HTMLDivElement>(null);
  const tabs = useMemo(() => visibleTabs(items), [items]);
  const [tabSlug, setTabSlug] = useState(tabs[0]?.slug ?? "trends");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const tab = tabs.find((t) => t.slug === tabSlug) ?? tabs[0];
  const list = useMemo(() => (tab ? itemsForTab(items, tab, query) : []), [items, tab, query]);
  const view = paginate(list, page);
  const first = (view.page - 1) * CATALOG_PAGE_SIZE;

  const goToPage = (next: number) => {
    setPage(next);
    // Keep the top of the grid in view after paging.
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={top} className="scroll-mt-20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Browse by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {tabs.map((t) => (
            <button
              key={t.slug}
              type="button"
              aria-pressed={t.slug === tab?.slug}
              onClick={() => {
                setTabSlug(t.slug);
                setPage(1);
              }}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                t.slug === tab?.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
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
              setPage(1);
            }}
            placeholder="Search this list"
            autoComplete="off"
            className="min-h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {tab && <p className="mt-3 text-sm text-muted-foreground">{tab.blurb}</p>}

      {view.total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nothing matches that search.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:border-primary/60"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {view.items.map((item, index) => (
              <DealsProductCard key={item.id} product={item} refSlug={`catalog-${tab?.slug ?? "all"}`} rank={first + index + 1} />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p role="status" className="text-sm text-muted-foreground">
              Showing {first + 1} to {first + view.items.length} of {view.total} products
            </p>
            {view.pages > 1 && (
              <nav aria-label="Catalog pages" className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(view.page - 1)}
                  disabled={view.page === 1}
                  aria-label="Previous page"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {Array.from({ length: view.pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    aria-label={`Page ${n}`}
                    aria-current={n === view.page ? "page" : undefined}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      n === view.page
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => goToPage(view.page + 1)}
                  disabled={view.page === view.pages}
                  aria-label="Next page"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}
