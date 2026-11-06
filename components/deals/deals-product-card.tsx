import { ExternalLink, Flame, Tag } from "lucide-react";
import { DealsImpression } from "@/components/deals/deals-impression";
import { dealsRef, goHref, hasProductImage } from "@/lib/deals-core";

type CardProduct = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  buy_if: string | null;
  rising: boolean;
};

// One product in the Deals section. No prices or discount claims: retail
// prices change daily, so the live price on the merchant's page is the only
// price we point to. Safe to use in both server and client components.
export function DealsProductCard({
  product,
  refSlug,
  rank,
  compact = false,
  headingLevel = 3,
}: {
  product: CardProduct;
  refSlug: string;
  rank?: number;
  // Smaller card for the category rows: no "Good if" text, tighter spacing.
  compact?: boolean;
  headingLevel?: 3 | 4;
}) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  return (
    <article
      id={`p-${product.id}`}
      className="relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50"
    >
      <DealsImpression productId={product.id} refLabel={dealsRef(refSlug)} />
      <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white ${compact ? "p-2" : "p-3"}`}>
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
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        {product.category && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>
        )}
        <Heading className={`mt-1.5 line-clamp-2 font-display font-bold leading-snug text-foreground ${compact ? "text-sm" : "text-base"}`}>{product.name}</Heading>
        {!compact && product.buy_if && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Good if:</span> {product.buy_if}
          </p>
        )}
        <a
          href={goHref(product.id, refSlug)}
          data-deals-product={product.id}
          data-deals-name={product.name}
          data-deals-ref={dealsRef(refSlug)}
          data-deals-rank={rank}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className={`${compact ? "mt-3 min-h-10 px-3 text-xs" : "mt-4 min-h-11 px-4 text-sm"} inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-auto`}
        >
          View on Amazon
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab): {product.name}</span>
        </a>
      </div>
    </article>
  );
}
