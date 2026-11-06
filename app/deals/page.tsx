import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { ArticleNewsCard } from "@/components/blog/article-news-card";
import { DealCard } from "@/components/deals/deal-card";
import { DealsCatalog } from "@/components/deals/deals-catalog";
import { DealsDisclosure } from "@/components/deals/deals-disclosure";
import { DealsMasthead } from "@/components/deals/deals-masthead";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { DealsSeriesCarousel } from "@/components/deals/deals-series-carousel";
import { SubscribeCard } from "@/components/newsletter/subscribe-card";
import { getDealsArticles, getDealsData } from "@/lib/deals";
import { HOLIDAYS, buildItemListJsonLd, buildSeries, isDealsActive } from "@/lib/deals-core";

// Built at most once an hour; the data is cached for 6 hours, so a visit adds
// no database reads.
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");
const TRENDING_SHOWN = 5;

export const metadata: Metadata = {
  title: "Holiday Deals 2026: Top Tech, Gear and Gift Picks | Phugialy Deals",
  description:
    "Top picks for Thanksgiving, Black Friday, Cyber Monday, Christmas and the New Year: the tech, desk gear and books Phugialy readers are opening most, plus featured deals. Refreshed daily.",
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

  const [data, articles] = await Promise.all([getDealsData(), getDealsArticles(12)]);
  const series = buildSeries(articles);
  const trending = data.top.slice(0, TRENDING_SHOWN);
  const updated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  const jsonLd = buildItemListJsonLd({
    name: "Holiday Deals 2026: trending picks",
    url: `${SITE}/deals`,
    items: trending.map((p) => ({ name: p.name, anchor: `p-${p.id}` })),
  });

  return (
    <>
      <Navigation />
      <DealsMasthead />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        {trending.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}
        <div className="mx-auto max-w-6xl">
          <header className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
              Holiday deals and top picks, refreshed daily.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The products readers are opening most this holiday season, in Top 10 lists by niche and holiday.
              Lists are ranked by what readers opened in the last week. They are not lab tests, and we do not show
              prices because they change daily.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Refreshed {updated}.</p>
            <DealsDisclosure className="mt-4" />
          </header>

          <section aria-labelledby="series" className="mt-12">
            <h2 id="series" className="font-display text-2xl font-bold">
              Top 10 series
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              One list per niche and holiday. Open one to see the ten products and why they made it.
            </p>
            <DealsSeriesCarousel cards={series} />
          </section>

          {trending.length > 0 && (
            <section aria-labelledby="trending" className="mt-14">
              <h2 id="trending" className="font-display text-2xl font-bold">
                Trending now
              </h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">The products readers opened most this week.</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {trending.map((product, index) => (
                  <DealsProductCard key={product.id} product={product} refSlug="trending" rank={index + 1} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="catalog" className="mt-14">
            <h2 id="catalog" className="font-display text-2xl font-bold">
              Top products by category
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Scroll each row sideways, or search every product.
            </p>
            {data.explorer.length > 0 ? (
              <DealsCatalog items={data.explorer} />
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

          <section aria-labelledby="guides" className="mt-14">
            <h2 id="guides" className="font-display text-2xl font-bold">
              Buying guides
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Our write-ups of the top recommendations: what reviewers liked, what they did not, and who each product suits.
            </p>
            {articles.length > 0 ? (
              <div className="grid gap-5">
                {articles.map((post) => (
                  <ArticleNewsCard key={post._id} post={post} variant="feed" />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                New guides are added regularly. Until then, start with a Top 10 list:{" "}
                {HOLIDAYS.map((h, i) => (
                  <span key={h.slug}>
                    {i > 0 && ", "}
                    <Link href={`/deals/${h.slug}`} className="underline underline-offset-2 hover:text-foreground">
                      {h.name}
                    </Link>
                  </span>
                ))}
                .
              </div>
            )}
          </section>

          {data.deals.length > 0 && (
            <section aria-labelledby="featured-deals" className="mt-14">
              <h2 id="featured-deals" className="font-display text-2xl font-bold">
                More offers
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
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
