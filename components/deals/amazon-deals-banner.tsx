import { ExternalLink, ShoppingBag } from "lucide-react";
import type { Deal } from "@/lib/deals-core";

// The big placement for Amazon's own deals page, tagged with our Associate id
// (the Deal is built in lib/deals.ts). It states no price and no discount: the
// prices are Amazon's, change through the day, and are read on Amazon. The
// disclosure sits right above it in the hero. Fixed colors, so it reads the same
// in light and dark themes.
export function AmazonDealsBanner({ deal, images = [] }: { deal: Deal; images?: { src: string; alt: string }[] }) {
  const photos = images.slice(0, 3);
  return (
    <aside
      aria-label="Amazon holiday deals"
      className="relative isolate flex h-full min-h-[18rem] flex-col justify-between overflow-hidden rounded-3xl border border-amber-300/60 bg-[linear-gradient(135deg,#fbbf24,#d97706_72%,#b45309)] p-6 text-neutral-950 shadow-lg md:p-8"
    >
      {photos.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 right-0 hidden h-40 w-52 sm:block">
          {photos.map((photo, i) => (
            <div
              key={photo.src}
              className="absolute aspect-square w-24 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10"
              style={{ right: `${i * 46}px`, top: `${i % 2 === 0 ? 22 : 6}px`, zIndex: 3 - i, transform: `rotate(${[8, -5, -12][i]}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> Live on Amazon
        </p>
        <h2 className="mt-4 font-display text-3xl font-black leading-[1.05] md:text-4xl">
          Shop Amazon&apos;s
          <br />
          holiday deals
        </h2>
        <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-neutral-900/90">
          Amazon updates its own deals page all season. Prices and stock are Amazon&apos;s and change through the day, so check today&apos;s price there.
        </p>
      </div>

      <div className="relative mt-6">
        <a
          href={deal.url}
          data-deals-deal={deal.id}
          data-deals-merchant={deal.merchant}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 text-lg font-bold text-white shadow-lg transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-950/40 sm:w-auto"
        >
          See today&apos;s Amazon deals
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="mt-3 text-xs font-medium text-neutral-900/80">We may earn a commission when you buy, at no extra cost to you.</p>
      </div>
    </aside>
  );
}
