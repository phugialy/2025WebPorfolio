"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { Rail } from "@/components/rails/rail";
import { trackNavigationEvent } from "@/lib/analytics";
import { CATALOG_PAGE_SIZE, CATALOG_MAX_PAGES, buildCategoryRows, filterExplorer, type ExplorerItem, type GuideLink } from "@/lib/deals-core";
import { PURCHASE_SIZES, PURCHASE_SIZE_LABEL, PURCHASE_SIZE_LEGEND, purchaseSize, type PurchaseSize } from "@/lib/deals-size";

const SEARCH_CAP = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES;

// Widths of the first cards in a row: lead, then two medium, then the standard size
// (the Rail default). Each step is about a fifth smaller than the one before.
const ROW_TIERS = ["w-[17.5rem] sm:w-[21rem]", "w-[14.5rem] sm:w-[16.5rem]", "w-[14.5rem] sm:w-[16.5rem]"];

// The catalog as a set of horizontal rows, one per category, like a streaming
// home screen: Thanksgiving, Christmas, Technology, AI, Desk setup, then
// whatever is left. Each row scrolls sideways and holds up to 30 products, so
// far more fits on screen than a paged grid. Typing in the search box swaps the
// rows for a single list of matches. All the data arrives with the page, so
// nothing here calls the server.
export function DealsCatalog({ items, guideLinks = {} }: { items: ExplorerItem[]; guideLinks?: Record<string, GuideLink> }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<PurchaseSize | "all">("all");
  const rows = useMemo(() => buildCategoryRows(items), [items]);
  // A search or a size choice swaps the category rows for one list of matches.
  const searching = query.trim().length > 0 || size !== "all";
  const matches = useMemo(
    () => (searching ? filterExplorer(items, { query, size, sort: "trending" }) : []),
    [items, query, size, searching]
  );
  // How many products carry each size, so a choice that would show nothing is not offered.
  const counts = useMemo(() => {
    const c: Record<PurchaseSize, number> = { small: 0, mid: 0, big: 0 };
    for (const item of items) {
      const s = purchaseSize(item);
      if (s) c[s] += 1;
    }
    return c;
  }, [items]);

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

  const chooseSize = (next: PurchaseSize | "all") => {
    setSize(next);
    trackNavigationEvent("deals_size_filter", { size: next });
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Size of purchase" className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Shop by size</span>
        {([["all", "Everything"], ...PURCHASE_SIZES.map((s) => [s, PURCHASE_SIZE_LABEL[s].plural] as const)] as const).map(([value, text]) => {
          const active = size === value;
          const disabled = value !== "all" && counts[value] === 0;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => chooseSize(value)}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
              }`}
            >
              {text}
              {value !== "all" && <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>{counts[value]}</span>}
            </button>
          );
        })}
      </div>
      <p className="mb-4 max-w-2xl text-xs text-muted-foreground">{PURCHASE_SIZE_LEGEND}</p>

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
              onClick={() => {
                setQuery("");
                setSize("all");
              }}
              className="mt-3 inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:border-primary/60"
            >
              Clear search and size
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p role="status" className="mb-3 text-sm text-muted-foreground">
              {matches.length > SEARCH_CAP ? `Top ${SEARCH_CAP} of ${matches.length} matches` : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {matches.slice(0, SEARCH_CAP).map((item) => (
                <DealsProductCard key={item.id} product={item} refSlug="catalog-search" compact headingLevel={3} guide={guideLinks[item.id]} />
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="mt-6 flex flex-col gap-9">
          {rows.map((row) => (
            // Cards step down in size across a row: a feature card, two medium cards, then
            // the standard size, so the row tapers instead of dropping from large to small.
            <Rail key={row.slug} id={`category-${row.slug}`} title={row.label} blurb={row.blurb} count={row.items.length} tierClassNames={row.items.length > 1 ? ROW_TIERS : undefined}>
              {row.items.map((item, index) =>
                index === 0 && row.items.length > 1 ? (
                  <DealsProductCard key={item.id} product={item} refSlug={`catalog-${row.slug}`} layout="stack" large headingLevel={4} guide={guideLinks[item.id]} />
                ) : index <= 2 && row.items.length > 2 ? (
                  <DealsProductCard key={item.id} product={item} refSlug={`catalog-${row.slug}`} headingLevel={4} guide={guideLinks[item.id]} />
                ) : (
                  <DealsProductCard key={item.id} product={item} refSlug={`catalog-${row.slug}`} compact headingLevel={4} guide={guideLinks[item.id]} />
                )
              )}
            </Rail>
          ))}
        </div>
      )}
    </div>
  );
}
