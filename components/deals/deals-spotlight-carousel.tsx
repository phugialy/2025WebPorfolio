"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { trackNavigationEvent } from "@/lib/analytics";
import type { ExplorerItem, GuideLink } from "@/lib/deals-core";

export type SpotlightSlide = {
  slug: string; // the category row this slide leads into (id "category-<slug>")
  label: string; // "Monitors", "Headphones and audio"
  blurb: string;
  total: number; // how many products the full row holds
  items: ExplorerItem[]; // the lead first, then up to four more
};

// One slide per product type: a large lead pick and four more beside it, with a
// link down to that type's full row. Meant to show the range, so a visitor
// who came for headphones sees headphones without scrolling through mini PCs.
// Nothing moves on its own: swipe, the arrows, the type tabs, or the keyboard.
export function DealsSpotlightCarousel({ slides, guideLinks = {} }: { slides: SpotlightSlide[]; guideLinks?: Record<string, GuideLink> }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }, [slides.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const goTo = (index: number, how: "arrow" | "tab") => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(slides.length - 1, Math.max(0, index));
    trackNavigationEvent("deals_spotlight", { slide: slides[next].slug, how });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  if (slides.length === 0) return null;

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured picks by product type" className="relative">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Product types" className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {slides.map((slide, i) => (
            <button
              key={slide.slug}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => goTo(i, "tab")}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                i === active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
              }`}
            >
              {slide.label}
            </button>
          ))}
        </div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button
            type="button"
            onClick={() => goTo(active - 1, "arrow")}
            disabled={active === 0}
            aria-label="Previous product type"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1, "arrow")}
            disabled={active === slides.length - 1}
            aria-label="Next product type"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul
        ref={track}
        role="list"
        onScroll={measure}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto"
      >
        {slides.map((slide, i) => (
          <li
            key={slide.slug}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${slide.label}`}
            // Slides out of view cannot be tabbed into or tapped by accident while swiping.
            inert={i !== active}
            className="w-full shrink-0 snap-start pr-0.5"
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {slide.items.slice(0, 5).map((item, index) => (
                <div key={item.id} className={`[&>article]:h-full ${index === 0 ? "col-span-2 lg:row-span-2" : ""}`}>
                  {index === 0 ? (
                    <DealsProductCard product={item} refSlug={`spotlight-${slide.slug}`} rank={index + 1} showRank={false} guide={guideLinks[item.id]} layout="stack" large fill />
                  ) : (
                    <DealsProductCard product={item} refSlug={`spotlight-${slide.slug}`} rank={index + 1} showRank={false} guide={guideLinks[item.id]} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <p className="min-w-0 text-muted-foreground">{slide.blurb}</p>
              <a
                href={`#category-${slide.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                See all {slide.total} <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
