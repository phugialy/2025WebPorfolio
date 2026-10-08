import type { AffiliateProduct } from "@/lib/affiliate";
import { AMBIT_COPY, AMBIT_ORANGE, ambitGoHref } from "@/lib/ambit-brand";
import { AmbitButton, AmbitFinePrint, AmbitLogo, SponsoredLabel } from "@/components/ambit/ambit-parts";

type Variant = "side" | "banner" | "inline";

// One canonical headline/body (lib/ambit-brand.ts) in three layouts:
//   side   -- the paragraph that sits next to the info card on the dashboard
//   banner -- the full-width horizontal strip on the blog index
//   inline -- the in-article callout for energy / household articles
// `refId` must match the label the page logs this placement's impression under.
export function AmbitSaveCallout({
  product,
  refId,
  variant,
  className,
}: {
  product: Pick<AffiliateProduct, "id">;
  refId: string;
  variant: Variant;
  className?: string;
}) {
  const href = ambitGoHref(product.id, refId);
  const surface = `border border-border bg-card`;
  const tint = { backgroundImage: `linear-gradient(135deg, ${AMBIT_ORANGE}14, transparent 60%)` };

  if (variant === "banner") {
    return (
      <aside
        aria-label="Sponsored: Ambit Energy"
        style={tint}
        className={`relative overflow-hidden rounded-2xl ${surface} p-5 sm:p-6 ${className ?? ""}`}
      >
        <div className="grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-7">
          <AmbitLogo className="w-fit" />
          <div className="min-w-0">
            <SponsoredLabel />
            <p className="mt-1.5 font-display text-xl font-bold leading-snug sm:text-2xl">
              {AMBIT_COPY.headline}
            </p>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {AMBIT_COPY.body}
            </p>
          </div>
          <AmbitButton href={href} className="w-full md:w-auto">
            {AMBIT_COPY.cta}
          </AmbitButton>
        </div>
        <AmbitFinePrint className="mt-4 max-w-3xl" />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Sponsored: Ambit Energy"
      style={tint}
      className={`flex flex-col rounded-2xl ${surface} p-6 sm:p-7 ${variant === "inline" ? "my-10" : "h-full"} ${className ?? ""}`}
    >
      <SponsoredLabel />
      <p className="mt-3 font-display text-2xl font-bold leading-snug">{AMBIT_COPY.headline}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{AMBIT_COPY.body}</p>
      <div className="mt-6">
        <AmbitButton href={href}>{AMBIT_COPY.cta}</AmbitButton>
      </div>
      {/* Fine print pins to the bottom so it lines up with the info card's. */}
      <AmbitFinePrint className="mt-auto pt-6" />
    </aside>
  );
}
