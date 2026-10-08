import type { AffiliateProduct } from "@/lib/affiliate";
import { AMBIT_CONSULTANT_NAME, ambitGoHref } from "@/lib/ambit-brand";
import { AmbitButton, AmbitFinePrint, AmbitLogo, SponsoredLabel } from "@/components/ambit/ambit-parts";

// The Ambit counterpart to the ElevenLabs partner card: who they are, who the
// consultant is, a plain "worth it / skip it" read, one link. `refId` must
// match the label the page logs this placement's impression under.
export function AmbitInfoCard({
  product,
  refId,
  className,
}: {
  product: AffiliateProduct;
  refId: string;
  className?: string;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-7 ${className ?? ""}`}
    >
      <SponsoredLabel />
      <AmbitLogo className="mt-5 w-fit" />

      <h2 className="mt-5 font-display text-2xl font-bold leading-tight">{product.name}</h2>
      <p className="mt-1 text-sm font-medium text-foreground">
        Independent Consultant: {AMBIT_CONSULTANT_NAME}
      </p>
      {product.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      )}

      {(product.buy_if || product.skip_if) && (
        <div className="mt-4 grid gap-1.5 text-sm leading-relaxed">
          {product.buy_if && (
            <p>
              <span className="font-semibold text-foreground">Worth a look if:</span>{" "}
              <span className="text-muted-foreground">{product.buy_if}</span>
            </p>
          )}
          {product.skip_if && (
            <p>
              <span className="font-semibold text-foreground">Skip it if:</span>{" "}
              <span className="text-muted-foreground">{product.skip_if}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-auto pt-6">
        <AmbitButton href={ambitGoHref(product.id, refId)}>See Ambit plans</AmbitButton>
        <AmbitFinePrint full className="mt-4" />
      </div>
    </article>
  );
}
