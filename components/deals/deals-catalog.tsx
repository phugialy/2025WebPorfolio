"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { Rail } from "@/components/rails/rail";
import { trackNavigationEvent } from "@/lib/analytics";
import { CATALOG_PAGE_SIZE, CATALOG_MAX_PAGES, buildCategoryRows, filterExplorer, type ExplorerItem } from "@/lib/deals-core";

const SEARCH_CAP = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES;

// The catalog as a set of horizontal rows, one per category, like a streaming
// home screen: Thanksgiving, Christmas, Technology, AI, Desk setup, then
// whatever is left. Each row scrolls sideways and holds up to 30 products, so
// far more fits on screen than a paged grid. Typing in the search box swaps the
// rows for a single list of matches. All the data arrives with the page, so
// nothing here calls the server.
export function DealsCatalog({ items }: { items: ExplorerItem[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => buildCategoryRows(items), [items]);
  const searching = query.trim().length > 0;
  const matches = useMemo(
    () => (searching ? filterExplorer(items, { query, sort: "trending" }) : []),
    [items, query, searching]
  );

  // What readers look for that we may not stock: one event once they stop typing.
  useEffect(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      trackNavigationEvent("deals_search", {
        term: term.slice(0, 40),
        result_count: String(matches.length),
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [query, matches.length]);

  return (
    <div>
      <div className="relative md:w-72">
        <label htmlFor={searchId} className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all products"
          autoComplete="off"
          className="min-h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {searching ? (
        matches.length === 0 ? (
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
          <div className="mt-5">
            <p role="status" className="mb-3 text-sm text-muted-foreground">
              {matches.length > SEARCH_CAP ? `Top ${SEARCH_CAP} of ${matches.length} matches` : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {matches.slice(0, SEARCH_CAP).map((item) => (
                <DealsProductCard key={item.id} product={item} refSlug="catalog-search" compact headingLevel={3} />
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="mt-6 flex flex-col gap-9">
          {rows.map((row) => (
            <Rail key={row.slug} title={row.label} blurb={row.blurb} count={row.items.length}>
              {row.items.map((item) => (
                <DealsProductCard key={item.id} product={item} refSlug={`catalog-${row.slug}`} compact headingLevel={4} />
              ))}
            </Rail>
          ))}
        </div>
      )}
    </div>
  );
}
