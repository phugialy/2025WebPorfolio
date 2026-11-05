"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { SeriesCard } from "@/lib/deals-core";

// Fixed dark gradients with white text so every card reads the same in light
// and dark themes. Cycled by position.
const TILES = [
  "bg-[linear-gradient(135deg,#1f2a44,#3b2a6b)]",
  "bg-[linear-gradient(135deg,#143d3a,#1f6f5c)]",
  "bg-[linear-gradient(135deg,#4a2a1a,#9a4a1f)]",
  "bg-[linear-gradient(135deg,#3a1d3f,#7a2f5c)]",
  "bg-[linear-gradient(135deg,#1c3350,#2a6a9a)]",
];

// The pinned row of "Top 10" series cards. Scrolls sideways (swipe, arrow
// buttons, or the keyboard) and always shows the start of the next card so it
// is clear there is more. No autoplay: it never moves on its own.
export function DealsSeriesCarousel({ cards }: { cards: SeriesCard[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(true);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanBack(el.scrollLeft > 4);
    setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update, cards.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const first = el.querySelector("li");
    const step = (first ? first.getBoundingClientRect().width : 300) + 20;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Pinned Top 10 series" className="relative">
      <div className="mb-3 hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={!canBack}
          aria-label="Previous Top 10 series"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={!canForward}
          aria-label="Next Top 10 series"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <ul
        ref={track}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:thin] motion-reduce:scroll-auto"
      >
        {cards.map((card, index) => (
          <li key={card.key} className="w-[78%] shrink-0 snap-start sm:w-[320px]">
            <Link
              href={card.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className={`relative flex aspect-[16/9] items-end overflow-hidden p-4 text-white ${
                  card.image ? "bg-black" : TILES[index % TILES.length]
                }`}
              >
                {card.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                )}
                <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 font-display text-[7rem] font-black leading-none text-white/15">
                  10
                </span>
                <span className="relative rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-900">
                  {card.niche}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-3 font-display text-base font-bold leading-snug text-foreground group-hover:text-primary">
                  {card.title}
                </h3>
                {card.blurb && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{card.blurb}</p>}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary sm:mt-auto sm:pt-4">
                  {card.kind === "article" ? "Read the guide" : "See the Top 10"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
