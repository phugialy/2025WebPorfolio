"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DrawerOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  themes: DrawerOption[];
  selectedTheme: string | null;
  onTheme: (value: string | null) => void;
  lanes: DrawerOption[];
  selectedLane: string | null;
  onLane: (value: string | null) => void;
  // Every tag with how many notes use it, so the most-used ones can lead.
  tags: { tag: string; count: number }[];
  selectedTag: string | null;
  onTag: (value: string | null) => void;
  resultCount: number;
  hasActive: boolean;
  onClear: () => void;
};

const SUGGESTED_TAGS = 18;
const MAX_TAG_MATCHES = 40;

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
  );

// The blog's filters, kept out of the way: a panel that slides in from the right
// when a reader asks for it. The page decides what the filters do; this draws them.
export function FilterDrawer(props: Props) {
  const { open, onClose, themes, selectedTheme, onTheme, lanes, selectedLane, onLane, tags, selectedTag, onTag, resultCount, hasActive, onClear } = props;
  const [tagQuery, setTagQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes; the page behind does not scroll while the panel is open;
  // focus moves in on open (the page returns it to the trigger on close).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const shownTags = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    if (!query) return tags.slice(0, SUGGESTED_TAGS);
    return tags.filter((t) => t.tag.toLowerCase().includes(query)).slice(0, MAX_TAG_MATCHES);
  }, [tags, tagQuery]);
  // A tag picked earlier must stay visible (and removable) even when it is not in the suggestions.
  const withSelected = selectedTag && !shownTags.some((t) => t.tag === selectedTag) ? [{ tag: selectedTag, count: 0 }, ...shownTags] : shownTags;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[60] bg-black/55 transition-opacity duration-200 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!open}
        inert={!open}
        data-testid="filter-drawer"
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-[22rem] max-w-full flex-col border-l border-border bg-background shadow-2xl shadow-black/50 transition-[transform,visibility] duration-200 motion-reduce:transition-none",
          open ? "visible translate-x-0" : "invisible translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Topic</h3>
            <div role="group" aria-label="Browse by theme" className="flex flex-wrap gap-2">
              {themes.map((theme) => (
                <button key={theme.value} type="button" aria-pressed={selectedTheme === theme.value} onClick={() => onTheme(selectedTheme === theme.value ? null : theme.value)} className={chip(selectedTheme === theme.value)}>
                  {theme.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Focus area</h3>
            <div role="group" aria-label="Focus area" className="flex flex-wrap gap-2">
              {lanes.map((lane) => (
                <button key={lane.value} type="button" aria-pressed={selectedLane === lane.value} onClick={() => onLane(selectedLane === lane.value ? null : lane.value)} className={chip(selectedLane === lane.value)}>
                  {lane.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tags</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={tagQuery}
                onChange={(event) => setTagQuery(event.target.value)}
                placeholder="Find a tag"
                aria-label="Find a tag"
                className="h-9 w-full rounded-md border border-border bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div role="group" aria-label="Tags" className="flex flex-wrap gap-2">
              {withSelected.map(({ tag }) => (
                <button key={tag} type="button" aria-pressed={selectedTag === tag} onClick={() => onTag(selectedTag === tag ? null : tag)} className={chip(selectedTag === tag)}>
                  {tag}
                </button>
              ))}
              {withSelected.length === 0 && <p className="text-sm text-muted-foreground">No tag matches that.</p>}
            </div>
            {!tagQuery && tags.length > SUGGESTED_TAGS && (
              <p className="mt-3 text-xs text-muted-foreground">Showing the {SUGGESTED_TAGS} most used of {tags.length}. Type to find the rest.</p>
            )}
          </section>
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          {hasActive && (
            <Button variant="outline" onClick={onClear}>
              Clear all
            </Button>
          )}
          <Button onClick={onClose} className="flex-1">
            {hasActive ? `Show ${resultCount} ${resultCount === 1 ? "note" : "notes"}` : "Done"}
          </Button>
        </div>
      </aside>
    </>
  );
}
