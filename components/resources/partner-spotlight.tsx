import { ArrowUpRight, Handshake } from "lucide-react";
import type { AffiliateProduct } from "@/lib/affiliate";

// Deliberately distinct from AffiliateProductCard -- a partnership is a
// different kind of claim than a Pick ("we chose this from the catalog")
// and should read differently, not just render bigger. Same dark/editorial
// visual language as the rest of the site (no gradients, no card-soup),
// but framed as a relationship, not a grid item.
export function PartnerSpotlight({ partners }: { partners: AffiliateProduct[] }) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
        <Handshake className="h-4 w-4" />
        Partner Spotlight
      </div>

      <div className="grid gap-4">
        {partners.map((partner) => (
          <article
            key={partner.id}
            className="grid gap-6 rounded-2xl border border-primary/20 bg-card p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8"
          >
            {partner.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.image_url}
                alt={partner.name}
                className="h-16 w-16 flex-none rounded-xl border object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border bg-primary/10 sm:h-20 sm:w-20">
                <Handshake className="h-7 w-7 text-primary" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Our first partner
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">{partner.name}</h2>
              {partner.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {partner.description}
                </p>
              )}

              {(partner.buy_if || partner.skip_if) && (
                <div className="mt-4 grid gap-1.5 text-sm leading-relaxed sm:grid-cols-2">
                  {partner.buy_if && (
                    <p>
                      <span className="font-semibold text-foreground">Worth it if:</span>{" "}
                      <span className="text-muted-foreground">{partner.buy_if}</span>
                    </p>
                  )}
                  {partner.skip_if && (
                    <p>
                      <span className="font-semibold text-foreground">Skip it if:</span>{" "}
                      <span className="text-muted-foreground">{partner.skip_if}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <a
                  href={`/api/affiliate/go/${partner.id}?ref=partner-spotlight`}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Try {partner.name}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="text-xs text-muted-foreground">
                  Paid partnership -- we earn a commission if you subscribe.
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
