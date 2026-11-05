import { ExternalLink, Percent } from "lucide-react";
import type { Deal } from "@/lib/deals-core";

// A featured deal from one of our merchants or partners. Shows the merchant's
// promo code when there is one; never states a price or a percent off.
export function DealCard({ deal }: { deal: Deal }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-primary/40 bg-primary/[0.05] p-5">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        <Percent className="h-3.5 w-3.5" aria-hidden="true" /> {deal.merchant}
      </p>
      <h3 className="mt-2 font-display text-lg font-bold leading-snug text-foreground">{deal.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{deal.description}</p>
      {deal.promoCode && (
        <p className="mt-3 text-sm text-foreground">
          Promo code:{" "}
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold">{deal.promoCode}</span>
        </p>
      )}
      {deal.validTo && <p className="mt-2 text-xs text-muted-foreground">Ends {deal.validTo}</p>}
      <a
        href={deal.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-auto"
      >
        See the deal
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab): {deal.title}</span>
      </a>
    </article>
  );
}
