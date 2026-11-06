"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Handshake, Pause, Play } from "lucide-react";
import type { AffiliateProduct } from "@/lib/affiliate";
import { AMBIT_ORANGE, ambitGoHref } from "@/lib/ambit-brand";
import { AmbitBannerBody } from "@/components/ambit/ambit-save-callout";
import { cn } from "@/lib/utils";

// One strip that takes turns showing each sponsor, so adding a partner means
// adding a slide, not another banner. Ambit keeps its approved copy and fine
// print untouched (AmbitBannerBody); every other partner uses the same shape
// built only from the fields on its catalog row, with no claims of our own.
//
// Rotation rules: it stops when the reader hovers or focuses inside, when they
// press pause, and always when their system asks for less motion. Every slide
// stays in the page at the height of the tallest one, so nothing jumps.
//
// Impressions: a slide is counted once per tab session, only while it is the
// one showing AND the strip is on screen. `refId` is the label both the click
// link and the impression use, so click-through can be worked out per slide.

export type SponsorSlide =
  | { kind: "ambit"; product: Pick<AffiliateProduct, "id">; refId: string; trackImpression?: boolean }
  | { kind: "partner"; product: AffiliateProduct; refId: string; trackImpression?: boolean };

const ROTATE_MS = 9000;
const FADE = "transition-opacity duration-500 motion-reduce:transition-none";

function PartnerBannerBody({ partner, refId }: { partner: AffiliateProduct; refId: string }) {
  return (
    <>
      <div className="grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-7">
        {partner.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.image_url}
            alt=""
            className="h-14 w-14 flex-none rounded-xl border border-border bg-white object-cover sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-border bg-primary/10 sm:h-16 sm:w-16">
            <Handshake className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Handshake className="h-3 w-3 text-primary" aria-hidden="true" />
            Sponsored · Partner
          </p>
          <p className="mt-1.5 font-display text-xl font-bold leading-snug sm:text-2xl">{partner.name}</p>
          {partner.description && (
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {partner.description}
            </p>
          )}
        </div>
        <a
          href={`/api/affiliate/go/${partner.id}?ref=${encodeURIComponent(refId)}`}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:w-auto"
        >
          Try {partner.name}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab, sponsored)</span>
        </a>
      </div>
      <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
        Paid partnership: we may earn a commission if you sign up through this link.{" "}
        <Link href="/disclosure" className="underline hover:text-foreground">
          Disclosure
        </Link>
      </p>
    </>
  );
}

export function SponsorBanner({ slides, className }: { slides: SponsorSlide[]; className?: string }) {
  const count = slides.length;
  const root = useRef<HTMLElement>(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const counted = useRef<Set<string>>(new Set());

  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  const active = count > 0 ? index % count : 0;
  const rotating = count > 1 && !userPaused && !hovering && !focusing && !reducedMotion;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), {
      threshold: 0.5,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Restarts whenever the slide changes, so picking a dot gives that slide a
  // full turn instead of an instant jump to the next one.
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [rotating, count, active]);

  useEffect(() => {
    const slide = slidesRef.current[active];
    if (!slide || slide.trackImpression === false || !onScreen || document.hidden) return;
    if (counted.current.has(slide.refId)) return;
    counted.current.add(slide.refId);
    const storageKey = `impression:${slide.refId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Storage blocked: the in-memory set above still stops repeats in this view.
    }
    fetch("/api/affiliate/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: slide.product.id, ref: slide.refId }),
      keepalive: true,
    }).catch(() => {});
  }, [active, onScreen]);

  if (count === 0) return null;

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Sponsored partners"
      aria-live={rotating ? "off" : "polite"}
      data-testid="sponsor-banner"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusing(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusing(false);
      }}
      className={cn("relative overflow-hidden rounded-2xl border border-border bg-card", className)}
    >
      <div className="grid">
        {slides.map((slide, i) => {
          const isActive = i === active;
          const label = slide.kind === "ambit" ? "Ambit Energy" : slide.product.name;
          return (
            <div
              key={`${slide.kind}-${slide.product.id}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${label}`}
              aria-hidden={!isActive}
              inert={!isActive}
              data-testid="sponsor-slide"
              data-active={isActive}
              style={
                slide.kind === "ambit"
                  ? { backgroundImage: `linear-gradient(135deg, ${AMBIT_ORANGE}14, transparent 60%)` }
                  : undefined
              }
              className={cn(
                "col-start-1 row-start-1 p-5 sm:p-6",
                count > 1 && "pb-12 md:pb-6",
                FADE,
                isActive ? "opacity-100" : "pointer-events-none invisible opacity-0"
              )}
            >
              {slide.kind === "ambit" ? (
                <AmbitBannerBody href={ambitGoHref(slide.product.id, slide.refId)} />
              ) : (
                <PartnerBannerBody partner={slide.product} refId={slide.refId} />
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-2 md:bottom-auto md:right-4 md:top-3">
          {/* Nothing rotates for someone who asked for less motion, so there is nothing to pause. */}
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "Resume rotating sponsors" : "Pause rotating sponsors"}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {userPaused ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={`dot-${slide.kind}-${slide.product.id}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show sponsor ${i + 1} of ${count}`}
                aria-current={i === active}
                className="flex h-6 w-4 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === active ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
