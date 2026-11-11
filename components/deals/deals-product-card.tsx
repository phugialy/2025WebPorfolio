import { Check, ExternalLink, Flame, Minus, Sparkles, Tag } from "lucide-react";
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
  type Badge,
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
  rising?: boolean; // no longer drives a label; see badge
  badge?: Badge | null;
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

// How big a card is drawn. The size follows importance, because the picture is
// what most people decide on:
//   default - the standard grid card (home and hub rows)
//   compact - the same, smaller, for category rows
//   wide    - picture left, details right (the older Top 10 card)
//   hero    - the lead pick: picture on one half of the card, large type
//   stack   - picture on top, details below; `large` makes it a feature card
//             (second and third picks, the lead of a category row, the hub's
//             lead card). `dense` turns it into a picture-left row on a phone and
//             a tile on wider screens (picks four to ten).
export type CardLayout = "default" | "compact" | "wide" | "hero" | "stack";

// One product in the Deals section. No prices or discount claims: retail
// prices change daily, so the live price on the merchant's page is the only
// price we point to. Safe to use in both server and client components.
export function DealsProductCard({
  product,
  refSlug,
  rank,
  compact = false,
  detailed = false,
  layout: layoutProp,
  large = false,
  dense = false,
  fill = false,
  showRank = true,
  note,
  idPrefix = "p",
  headingLevel = 3,
  guide,
}: {
  product: CardProduct;
  refSlug: string;
  rank?: number;
  // Smaller card for the category rows: no "Good if" text, tighter spacing.
  compact?: boolean;
  // Older name for layout "wide".
  detailed?: boolean;
  layout?: CardLayout;
  large?: boolean;
  dense?: boolean;
  // A large lead card whose picture grows to fill the height of the grid cell it sits in.
  fill?: boolean;
  // Whether the #rank badge is drawn. Tracking still records the rank either way.
  showRank?: boolean;
  // One line shown on a lead card that has no facts yet. Only the caller knows whether a
  // claim like "most opened" is true where the card is shown, so the card never makes it up.
  note?: string;
  // The card's page id is `${idPrefix}-${productId}`. A product that appears twice on one page
  // (for example in the carousel and in its row) needs a different prefix in each place.
  idPrefix?: string;
  headingLevel?: 3 | 4;
  // The published guide that features this product, if there is one.
  guide?: GuideLink;
}) {
  const layout: CardLayout = layoutProp ?? (detailed ? "wide" : compact ? "compact" : "default");
  const isCompact = layout === "compact";
  const rich = layout === "wide" || layout === "hero" || layout === "stack"; // shows the card facts
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const facts = product.facts ?? null;
  const buyIf = facts?.buyIf ?? product.buy_if;
  const skipIf = facts?.skipIf ?? product.skip_if ?? null;
  const showPrice = SHOW_PRICE_CLASS && facts?.priceClass ? PRICE_CLASS_LABEL[facts.priceClass] : null;
  const size = purchaseSize(product);
  const bigType = layout === "hero" || (layout === "stack" && large);
  const maxStrengths = layout === "stack" && !large ? 2 : 3;
  const maxCaveats = layout === "stack" && !large ? 1 : 2;

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
      className={`${isCompact ? "mt-3 min-h-10 px-3 text-xs" : bigType ? "mt-5 min-h-12 px-5 text-base" : "mt-4 min-h-11 px-3 text-[13px] sm:px-4 sm:text-sm"} inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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

  // The picture. Most of a card's weight: a large, nearly edge-to-edge product
  // shot on white, with only a thin margin.
  const pictureBox: Record<CardLayout, string> = {
    default: "aspect-[4/3]",
    compact: "aspect-[4/3]",
    wide: "aspect-[4/3] sm:aspect-auto sm:w-56 sm:shrink-0 md:w-64",
    hero: "aspect-[4/3] md:aspect-auto md:min-h-[26rem]",
    stack: dense
      ? "aspect-square w-28 shrink-0 sm:aspect-[4/3] sm:w-full"
      : large && fill
        ? "aspect-[4/3] lg:aspect-auto lg:min-h-[18rem] lg:flex-1"
        : "aspect-[4/3]",
  };
  const pictureInset: Record<CardLayout, string> = {
    default: "p-1.5",
    compact: "p-1",
    wide: "p-2",
    hero: "p-4 md:p-8",
    stack: dense ? "p-1.5" : large ? "p-3" : "p-2",
  };
  const picture = (
    <div className={`relative flex items-center justify-center overflow-hidden bg-white ${pictureBox[layout]}`}>
      {hasProductImage(product.image_url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url!} alt={product.name} loading="lazy" className={`absolute inset-0 h-full w-full object-contain ${pictureInset[layout]}`} />
      ) : (
        // Some catalog rows have no real picture yet (only Amazon's generic
        // logo); a neutral tile looks better than another store's logo.
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
          <Tag className="h-10 w-10 text-primary/70" aria-hidden="true" />
          <span className="px-3 text-center text-xs font-medium">{product.category || "Product"}</span>
        </div>
      )}
      {rank !== undefined && showRank && (
        <span
          className={`absolute left-3 top-3 inline-flex items-center justify-center rounded-full bg-foreground font-bold text-background ${
            layout === "hero" ? "h-10 min-w-10 px-3 text-base" : dense ? "h-7 min-w-7 px-1.5 text-xs sm:h-8 sm:min-w-8 sm:px-2 sm:text-sm" : "h-8 min-w-8 px-2 text-sm"
          }`}
        >
          #{rank}
        </span>
      )}
      {product.badge && (
        <span
          data-deals-badge={product.badge}
          className={`absolute right-2 top-2 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px] ${
            product.badge === "new" ? "bg-emerald-500 text-emerald-950" : "bg-primary text-primary-foreground"
          } ${dense ? "hidden sm:inline-flex" : "inline-flex"}`}
        >
          {product.badge === "new" ? (
            <>
              <Sparkles className="h-3 w-3" aria-hidden="true" /> New<span className="hidden sm:inline"> this week</span>
            </>
          ) : (
            <>
              <Flame className="h-3 w-3" aria-hidden="true" /> Trending<span className="hidden sm:inline"> now</span>
            </>
          )}
        </span>
      )}
    </div>
  );

  const eyebrow = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {product.category && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>}
      {size && <PurchaseSizeChip size={size} compact={isCompact} />}
      {showPrice && (
        <p className="text-[11px] font-semibold text-muted-foreground" title={showPrice.text}>
          <span aria-hidden="true">{showPrice.mark}</span>
          <span className="sr-only">{showPrice.text}</span>
        </p>
      )}
    </div>
  );

  if (rich) {
    const evidence = facts ? evidenceLine(facts) : "";
    const articleClass: Record<"wide" | "hero" | "stack", string> = {
      wide: "flex-col rounded-2xl sm:flex-row",
      hero: "grid rounded-3xl border-primary/50 md:grid-cols-[1.1fr_1fr]",
      stack: dense ? "flex-row rounded-2xl sm:flex-col" : "flex-col rounded-2xl",
    };
    // On a phone a dense tile is a short row, so the long details wait for wider screens.
    const detailVisibility = layout === "stack" && dense ? "hidden sm:block" : "";
    return (
      <article
        id={`${idPrefix}-${product.id}`}
        className={`relative flex h-full scroll-mt-24 overflow-hidden border border-border bg-card transition hover:border-primary/50 ${articleClass[layout as "wide" | "hero" | "stack"]} ${layout === "hero" ? "!grid" : ""}`}
      >
        <DealsImpression productId={product.id} refLabel={dealsRef(refSlug)} />
        {picture}
        <div className={`flex min-w-0 flex-col ${fill && large && layout === "stack" ? "flex-none" : "flex-1"} ${layout === "hero" ? "p-5 md:p-8" : dense ? "p-3 sm:p-4" : "p-4"}`}>
          {eyebrow}
          <Heading
            className={`mt-1.5 font-display font-bold leading-snug text-foreground ${
              layout === "hero" ? "text-xl md:text-3xl" : bigType ? "text-lg" : "text-base"
            } ${dense ? "line-clamp-3 sm:line-clamp-2" : "line-clamp-2"}`}
          >
            {product.name}
          </Heading>
          {note && !facts?.whatItIs && !buyIf && !skipIf && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{note}</p>}
          {facts?.whatItIs && (
            <p className={`mt-1.5 leading-relaxed text-foreground/90 ${layout === "hero" ? "text-base" : "text-sm"} ${dense ? "line-clamp-2 sm:line-clamp-3" : ""}`}>
              {facts.whatItIs}
            </p>
          )}
          {facts?.bestFor && (
            <p className={`mt-1.5 text-xs leading-relaxed text-muted-foreground ${detailVisibility}`}>
              <span className="font-semibold text-foreground">Best for:</span> {facts.bestFor}
            </p>
          )}

          {facts && (facts.strengths.length > 0 || facts.caveats.length > 0) && (
            <ul className={`mt-3 space-y-1.5 text-xs leading-snug text-foreground/90 ${detailVisibility}`}>
              {facts.strengths.slice(0, maxStrengths).map((text) => (
                <li key={`s-${text}`} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Liked: </span>
                    {text}
                  </span>
                </li>
              ))}
              {facts.caveats.slice(0, maxCaveats).map((text) => (
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

          {facts && facts.keySpecs.length > 0 && (layout === "wide" || layout === "hero" || large) && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Key specs">
              {facts.keySpecs.map((spec) => (
                <li key={spec} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {spec}
                </li>
              ))}
            </ul>
          )}

          {(buyIf || skipIf) && (
            <div className={`mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground ${detailVisibility}`}>
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
            <p className={`mt-3 text-[11px] leading-relaxed text-muted-foreground ${detailVisibility}`}>
              <span className="font-semibold text-foreground">{VERDICT_LABEL[facts.verdict]}</span>
              {facts.confidence ? ` (${facts.confidence} confidence)` : ""}. {evidence}
            </p>
          )}

          <div className="mt-auto">
            {cta}
            <p className={`mt-1.5 text-center text-[11px] text-muted-foreground ${detailVisibility}`}>Prices change daily. Check today&apos;s price on Amazon.</p>
            {guideLink}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`${idPrefix}-${product.id}`}
      className="relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50"
    >
      <DealsImpression productId={product.id} refLabel={dealsRef(refSlug)} />
      {picture}
      <div className={`flex flex-1 flex-col ${isCompact ? "p-3" : "p-3 sm:p-4"}`}>
        {product.category && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>}
        {size && (
          <div className="mt-1.5">
            <PurchaseSizeChip size={size} compact={isCompact} />
          </div>
        )}
        <Heading className={`mt-1.5 line-clamp-2 font-display font-bold leading-snug text-foreground ${isCompact ? "text-sm" : "text-base"}`}>{product.name}</Heading>
        {!isCompact && (facts?.whatItIs || buyIf) && (
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
        <div className="mt-auto">{cta}</div>
        {guideLink}
      </div>
    </article>
  );
}
