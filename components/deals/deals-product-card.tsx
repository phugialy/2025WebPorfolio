import { Check, ExternalLink, Flame, Minus, Tag } from "lucide-react";
import { DealsImpression } from "@/components/deals/deals-impression";
import { PurchaseSizeChip } from "@/components/deals/purchase-size-chip";
import { purchaseSize } from "@/lib/deals-size";
import {
  PRICE_CLASS_LABEL,
  SHOW_PRICE_CLASS,
  VERDICT_LABEL,
  dealsRef,
  goHref,
  hasProductImage,
  type GuideLink,
  type ProductFacts,
} from "@/lib/deals-core";

type CardProduct = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  buy_if: string | null;
  skip_if?: string | null;
  rising: boolean;
  facts?: ProductFacts | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2025-12-15" -> "Dec 2025". Anything else returns null.
export function monthYear(date: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(date ?? "");
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : null;
}

// The line under a verdict that says how much it rests on, e.g.
// "Based on 2 independent reviews, newest Dec 2025." Empty when nothing is known.
export function evidenceLine(facts: ProductFacts): string {
  if (facts.evidenceCount === null) return "";
  const n = facts.evidenceCount;
  const base = n === 0 ? "No independent reviews read yet" : `Based on ${n} independent ${n === 1 ? "review" : "reviews"}`;
  const newest = monthYear(facts.evidenceNewest);
  return newest && n > 0 ? `${base}, newest ${newest}.` : `${base}.`;
}

// One product in the Deals section. No prices or discount claims: retail
// prices change daily, so the live price on the merchant's page is the only
// price we point to. Safe to use in both server and client components.
//
// Three shapes:
//   default  - square-ish card with name and a "Good if" line (home and hub rows)
//   compact  - the same, smaller, for category rows
//   detailed - a wide card for the Top 10 pages: what it is, who it is for, what
//              reviewers liked and did not, and how sure we are. Uses the product's
//              card facts and falls back to its own buy_if / skip_if text.
export function DealsProductCard({
  product,
  refSlug,
  rank,
  compact = false,
  detailed = false,
  headingLevel = 3,
  guide,
}: {
  product: CardProduct;
  refSlug: string;
  rank?: number;
  // Smaller card for the category rows: no "Good if" text, tighter spacing.
  compact?: boolean;
  detailed?: boolean;
  headingLevel?: 3 | 4;
  // The published guide that features this product, if there is one.
  guide?: GuideLink;
}) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const facts = product.facts ?? null;
  const buyIf = facts?.buyIf ?? product.buy_if;
  const skipIf = facts?.skipIf ?? product.skip_if ?? null;
  const showPrice = SHOW_PRICE_CLASS && facts?.priceClass ? PRICE_CLASS_LABEL[facts.priceClass] : null;
  const size = purchaseSize(product);

  const cta = (
    <a
      href={goHref(product.id, refSlug)}
      data-deals-product={product.id}
      data-deals-name={product.name}
      data-deals-ref={dealsRef(refSlug)}
      data-deals-rank={rank}
      data-deals-size={size ?? undefined}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`${compact ? "mt-3 min-h-10 px-3 text-xs" : "mt-4 min-h-11 px-4 text-sm"} inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${detailed ? "" : "sm:mt-auto"}`}
    >
      View on Amazon
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab): {product.name}</span>
    </a>
  );

  const guideLink = guide && (
    <a
      href={`/blog/${guide.slug}`}
      data-deals-guide={guide.slug}
      data-deals-ref={dealsRef(refSlug)}
      className="mt-2 inline-flex min-h-9 items-center justify-center rounded-md px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Read the guide
      <span className="sr-only">: {guide.title}</span>
    </a>
  );

  const picture = (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-white ${
        detailed ? "aspect-[4/3] sm:aspect-auto sm:w-56 sm:shrink-0 md:w-64" : "aspect-[4/3]"
      } ${compact ? "p-2" : "p-3"}`}
    >
      {hasProductImage(product.image_url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url!} alt={product.name} loading="lazy" className={`absolute inset-0 h-full w-full object-contain ${compact ? "p-2" : "p-3"}`} />
      ) : (
        // Some catalog rows only have Amazon's generic placeholder logo as an
        // image; a neutral tile looks better than another store's logo.
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
          <Tag className="h-10 w-10 text-primary/70" aria-hidden="true" />
          <span className="px-3 text-center text-xs font-medium">{product.category || "Product"}</span>
        </div>
      )}
      {rank !== undefined && (
        <span className="absolute left-3 top-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-foreground px-2 text-sm font-bold text-background">
          #{rank}
        </span>
      )}
      {product.rising && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
          <Flame className="h-3 w-3" aria-hidden="true" /> Trending now
        </span>
      )}
    </div>
  );

  if (detailed) {
    const evidence = facts ? evidenceLine(facts) : "";
    return (
      <article
        id={`p-${product.id}`}
        className="relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50 sm:flex-row"
      >
        <DealsImpression productId={product.id} refLabel={dealsRef(refSlug)} />
        {picture}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.category && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>
            )}
            {size && <PurchaseSizeChip size={size} />}
            {showPrice && (
              <p className="text-[11px] font-semibold text-muted-foreground" title={showPrice.text}>
                <span aria-hidden="true">{showPrice.mark}</span>
                <span className="sr-only">{showPrice.text}</span>
              </p>
            )}
          </div>
          <Heading className="mt-1.5 line-clamp-2 font-display text-base font-bold leading-snug text-foreground">{product.name}</Heading>
          {facts?.whatItIs && <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{facts.whatItIs}</p>}
          {facts?.bestFor && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Best for:</span> {facts.bestFor}
            </p>
          )}

          {facts && (facts.strengths.length > 0 || facts.caveats.length > 0) && (
            <ul className="mt-3 space-y-1.5 text-xs leading-snug text-foreground/90">
              {facts.strengths.map((text) => (
                <li key={`s-${text}`} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Liked: </span>
                    {text}
                  </span>
                </li>
              ))}
              {facts.caveats.map((text) => (
                <li key={`c-${text}`} className="flex gap-2 text-muted-foreground">
                  <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Catch: </span>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {facts && facts.keySpecs.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Key specs">
              {facts.keySpecs.map((spec) => (
                <li key={spec} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {spec}
                </li>
              ))}
            </ul>
          )}

          {(buyIf || skipIf) && (
            <div className="mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {buyIf && (
                <p>
                  <span className="font-semibold text-foreground">Buy if:</span> {buyIf}
                </p>
              )}
              {skipIf && (
                <p>
                  <span className="font-semibold text-foreground">Skip if:</span> {skipIf}
                </p>
              )}
            </div>
          )}

          {facts?.verdict && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{VERDICT_LABEL[facts.verdict]}</span>
              {facts.confidence ? ` (${facts.confidence} confidence)` : ""}. {evidence}
            </p>
          )}

          <div className="mt-auto">
            {cta}
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Prices change daily. Check today&apos;s price on Amazon.</p>
            {guideLink}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`p-${product.id}`}
      className="relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50"
    >
      <DealsImpression productId={product.id} refLabel={dealsRef(refSlug)} />
      {picture}
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        {product.category && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>
        )}
        {size && (
          <div className="mt-1.5">
            <PurchaseSizeChip size={size} compact={compact} />
          </div>
        )}
        <Heading className={`mt-1.5 line-clamp-2 font-display font-bold leading-snug text-foreground ${compact ? "text-sm" : "text-base"}`}>{product.name}</Heading>
        {!compact && (facts?.whatItIs || buyIf) && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {facts?.whatItIs ? (
              facts.whatItIs
            ) : (
              <>
                <span className="font-semibold text-foreground">Good if:</span> {buyIf}
              </>
            )}
          </p>
        )}
        {cta}
        {guideLink}
      </div>
    </article>
  );
}
