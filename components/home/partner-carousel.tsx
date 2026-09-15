"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Handshake } from "lucide-react";
import type { AffiliateProduct } from "@/lib/affiliate";

const ROTATE_INTERVAL_MS = 7000;

// Built as real carousel mechanics from day one, not a single-partner card
// that gets rebuilt later -- but dots/arrows only render once there's
// something to rotate *to*, so with one partner this reads as a clean
// static spotlight instead of an obviously-empty carousel.
export function PartnerCarousel({ partners }: { partners: AffiliateProduct[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (partners.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % partners.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [partners.length, paused]);

  if (partners.length === 0) {
    return null;
  }

  const partner = partners[index % partners.length];
  // Distinct ref from the /resources spotlight and in-article Picks, so
  // homepage-driven clicks show up as their own line in click data instead
  // of blending into the other placements.
  const href = `/api/affiliate/go/${partner.id}?ref=homepage-carousel`;

  return (
    <div
      className="relative overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-5 shadow-xl shadow-black/20 sm:p-7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        <Handshake className="h-3.5 w-3.5" />
        Our Partner
      </div>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        {partner.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.image_url}
            alt={partner.name}
            className="h-20 w-20 flex-none rounded-2xl border border-white/10 bg-black/25 object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl border border-white/10 bg-black/25 sm:h-24 sm:w-24">
            <Handshake className="h-8 w-8 text-primary" />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl">
            {partner.name}
          </h2>
          {partner.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {partner.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a
              href={href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Try {partner.name}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-muted-foreground">
              Paid partnership -- we earn a commission if you subscribe.
            </p>
          </div>
        </div>
      </div>

      {partners.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {partners.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Show partner ${i + 1} of ${partners.length}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/35"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
