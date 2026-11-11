"use client";

import { Children, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trackNavigationEvent } from "@/lib/analytics";

// A titled horizontal row that scrolls sideways, like a streaming home screen.
// Plain CSS scroll-snap does the scrolling (touch, trackpad, keyboard focus all
// work natively); the arrow buttons are a convenience on wide screens. Nothing
// moves on its own. Used by the Deals page and the blog.
export function Rail({
  title,
  blurb,
  count,
  action,
  itemClassName = "w-[11.5rem] sm:w-[13.5rem]",
  tierClassNames,
  id,
  children,
}: {
  title: string;
  blurb?: string;
  count?: number;
  action?: ReactNode;
  itemClassName?: string;
  // Widths for the first items of the row, in order, so cards can step down in size
  // (lead, then a middle size) instead of jumping straight to the smallest. Items
  // after these use itemClassName.
  tierClassNames?: string[];
  id?: string; // lets a link elsewhere on the page jump to this row
  children: ReactNode;
}) {
  const headingId = useId();
  const scroller = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, children]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    trackNavigationEvent("rail_scroll", { row: title, direction: direction === 1 ? "forward" : "back" });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section id={id} aria-labelledby={headingId} className="min-w-0 scroll-mt-24">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-display text-xl font-bold leading-tight text-foreground">
            {title}
            {typeof count === "number" && (
              <>
                {/* A screen reader would otherwise read "Thanksgiving30". */}
                <span className="sr-only">: </span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">{count}</span>
              </>
            )}
          </h3>
          {blurb && <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <div className="hidden gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!canPrev}
              aria-label={`Scroll ${title} back`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!canNext}
              aria-label={`Scroll ${title} forward`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <ul
        ref={scroller}
        role="list"
        onScroll={measure}
        className={`-mx-4 mt-3 flex snap-x snap-proximity gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:thin] md:mx-0 md:scroll-px-0 md:px-0 ${tierClassNames?.length ? "items-start" : ""}`}
      >
        {Children.map(children, (child, index) =>
          child ? <li className={`${tierClassNames?.[index] ?? itemClassName} shrink-0 snap-start`}>{child}</li> : null
        )}
      </ul>
    </section>
  );
}
