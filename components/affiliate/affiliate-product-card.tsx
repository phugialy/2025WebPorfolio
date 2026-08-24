import { ExternalLink, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AffiliateProduct } from "@/lib/affiliate";

const laneStyles: Record<string, string> = {
  amazon: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  other: "border-primary/30 bg-primary/10 text-primary",
};

export function AffiliateProductCard({
  product,
  articleSlug,
  className,
}: {
  product: AffiliateProduct;
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
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>

        <a
          href={href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary"
        >
          View product
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      Some links on this page are affiliate links, including as an Amazon Associate. We may earn
      a commission from qualifying purchases at no extra cost to you.
    </p>
  );
}

export function AffiliateProductRail({
  products,
  articleSlug,
}: {
  products: AffiliateProduct[];
  articleSlug: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Tools mentioned</h2>
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
