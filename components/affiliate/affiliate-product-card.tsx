import Link from "next/link";
import { ExternalLink, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovedArticleProduct } from "@/lib/affiliate";
import { TrackedLink } from "@/components/analytics/tracked-link";

const laneStyles: Record<string, string> = {
  amazon: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  other: "border-primary/30 bg-primary/10 text-primary",
};

export function AffiliateProductCard({
  product,
  articleSlug,
  className,
}: {
  product: ApprovedArticleProduct;
  articleSlug: string;
  className?: string;
}) {
  const href = `/api/affiliate/go/${product.id}?ref=${encodeURIComponent(articleSlug)}`;

  return (
    <article
      className={cn(
        "flex gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl",
        className
      )}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="h-24 w-24 flex-none rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-24 w-24 flex-none items-center justify-center rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.28),transparent_34%),linear-gradient(135deg,rgba(18,18,18,1),rgba(38,38,38,0.9))]">
          <Tag className="h-8 w-8 text-primary/80" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
              laneStyles[product.network]
            )}
          >
            {product.network === "amazon" ? "Amazon" : product.brand || "Recommended"}
          </span>
          <h3 className="mt-2 line-clamp-1 font-display text-base font-bold">{product.name}</h3>
          {product.buy_if || product.skip_if ? (
            <div className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {product.buy_if && (
                <p>
                  <span className="font-semibold text-foreground">We&apos;d buy this if:</span>{" "}
                  {product.buy_if}
                </p>
              )}
              {product.skip_if && (
                <p>
                  <span className="font-semibold text-foreground">We&apos;d skip this if:</span>{" "}
                  {product.skip_if}
                </p>
              )}
            </div>
          ) : (
            product.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )
          )}
          {product.context_note && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              Recommended for: {product.context_note}
            </p>
          )}
          {product.promo_code && (
            <p className="mt-2 text-xs text-primary">
              Use code <span className="font-semibold">{product.promo_code}</span>
              {product.promo_details ? ` — ${product.promo_details}` : ""}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <a
            href={href}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary"
          >
            View product
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <TrackedLink
            href={`/resources/${product.id}`}
            eventName="article_to_resource"
            eventParams={{ from_slug: articleSlug, to_resource: product.id }}
            className="inline-flex w-fit items-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Learn more
          </TrackedLink>
        </div>
      </div>
    </article>
  );
}

export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      Some Phugialy Picks use affiliate links. If you buy through one, Phugialy may earn a
      commission. It doesn&apos;t change what we recommend.{" "}
      <Link href="/disclosure" className="underline hover:text-foreground">
        Full disclosure →
      </Link>
    </p>
  );
}

export function AffiliateProductRail({
  products,
  articleSlug,
}: {
  products: ApprovedArticleProduct[];
  articleSlug: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Phugialy Picks</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <AffiliateProductCard key={product.id} product={product} articleSlug={articleSlug} />
        ))}
      </div>
      <AffiliateDisclosure className="mt-4" />
    </section>
  );
}
