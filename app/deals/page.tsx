import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { ArticleNewsCard } from "@/components/blog/article-news-card";
import { DealCard } from "@/components/deals/deal-card";
import { DealsDisclosure } from "@/components/deals/deals-disclosure";
import { DealsExplorer } from "@/components/deals/deals-explorer";
import { DealsMasthead } from "@/components/deals/deals-masthead";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { SubscribeCard } from "@/components/newsletter/subscribe-card";
import { getDealsArticles, getDealsData } from "@/lib/deals";
import { HOLIDAYS, buildItemListJsonLd, isDealsActive } from "@/lib/deals-core";

// Built at most once an hour; the data is cached for 6 hours, so a visit adds
// no database reads.
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Holiday Deals 2026: Top Tech, Gear and Gift Picks | Phugialy Deals",
  description:
    "Top picks for Black Friday, Cyber Monday, Christmas and the New Year: the tech, desk gear and books Phugialy readers are opening most, plus featured deals. Refreshed daily.",
  alternates: { canonical: `${SITE}/deals` },
  openGraph: {
    type: "website",
    url: `${SITE}/deals`,
    title: "Holiday Deals 2026: Top Tech, Gear and Gift Picks",
    description: "What readers are opening most this holiday season, by category and by holiday. Refreshed daily.",
  },
};

export default async function DealsPage() {
  // After the season the section sends visitors to the permanent resources page.
  if (!isDealsActive()) redirect("/resources");

  const [data, articles] = await Promise.all([getDealsData(), getDealsArticles(6)]);
  const updated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  const jsonLd = buildItemListJsonLd({
    name: "Holiday Deals 2026: trending picks",
    url: `${SITE}/deals`,
    items: data.top.map((p) => ({ name: p.name, anchor: `p-${p.id}` })),
  });

  return (
    <>
      <Navigation />
      <DealsMasthead />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        {data.top.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}
        <div className="mx-auto max-w-6xl">
          <header className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
              Holiday deals and top picks, refreshed daily.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The products readers are opening most this holiday season, grouped by category and by holiday,
              plus featured offers from the stores we work with. Lists are ranked by what readers opened in the
              last week. They are not lab tests, and we do not show prices because they change daily.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Refreshed {updated}.</p>
            <DealsDisclosure className="mt-4" />
          </header>

          {data.deals.length > 0 && (
            <section aria-labelledby="featured-deals" className="mt-12">
              <h2 id="featured-deals" className="font-display text-2xl font-bold">
                Featured deals
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="by-holiday" className="mt-14">
            <h2 id="by-holiday" className="font-display text-2xl font-bold">
              Top 10 by holiday
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {HOLIDAYS.map((h) => (
                <Link
                  key={h.slug}
                  href={`/deals/${h.slug}`}
                  className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{h.name}</p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug group-hover:text-primary">{h.h1}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{h.intro}</p>
                </Link>
              ))}
            </div>
          </section>

          {data.top.length > 0 && (
            <section aria-labelledby="trending" className="mt-14">
              <h2 id="trending" className="font-display text-2xl font-bold">
                Trending now
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {data.top.map((product) => (
                  <DealsProductCard key={product.id} product={product} refSlug="top" />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="explore" className="mt-14">
            <h2 id="explore" className="font-display text-2xl font-bold">
              Find a product
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">Search or filter everything we feature.</p>
            {data.explorer.length > 0 ? (
              <DealsExplorer items={data.explorer} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Picks are being refreshed. Check back in a few minutes, or browse our{" "}
                <Link href="/resources" className="underline underline-offset-2 hover:text-foreground">
                  resources
                </Link>
                .
              </p>
            )}
          </section>

          {articles.length > 0 && (
            <section aria-labelledby="guides" className="mt-14">
              <h2 id="guides" className="font-display text-2xl font-bold">
                Latest buying guides
              </h2>
              <div className="mt-5 grid gap-5">
                {articles.map((post) => (
                  <ArticleNewsCard key={post._id} post={post} variant="feed" />
                ))}
              </div>
            </section>
          )}

          <SubscribeCard source="deals-page" className="mt-16 max-w-3xl" />
        </div>
      </main>
    </>
  );
}
