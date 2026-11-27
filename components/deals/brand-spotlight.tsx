import Link from "next/link";

// A plain link card from /deals to a brand page. No database, so it can be tested.
export function BrandSpotlight({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/deals/insta360"
      data-brand-spotlight="insta360"
      className={`group relative block overflow-hidden rounded-2xl bg-neutral-950 p-5 text-white transition-transform hover:-translate-y-0.5 motion-reduce:transition-none md:p-6 ${className}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border-[14px] border-[#ffd400]/80" />
      <span className="relative text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd400]">Brand check</span>
      <span className="relative mt-2 block font-display text-xl font-bold leading-snug md:text-2xl">Is Insta360 worth it? We dug into the market.</span>
      <span className="relative mt-2 block max-w-2xl text-sm leading-relaxed text-white/80">
        360 cameras, the Luna pocket gimbal and the Ace Pro 2, checked against US search data and independent reviews.
      </span>
      <span className="relative mt-3 inline-block text-sm font-semibold text-[#ffd400] group-hover:underline">See the picks</span>
    </Link>
  );
}
