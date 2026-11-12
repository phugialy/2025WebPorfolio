import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { ArticleNewsCard } from "@/components/blog/article-news-card";
import { AmazonDealsBanner } from "@/components/deals/amazon-deals-banner";
import { DealCard } from "@/components/deals/deal-card";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsCatalog } from "@/components/deals/deals-catalog";
import { DealsDisclosure } from "@/components/deals/deals-disclosure";
import { DealsMasthead } from "@/components/deals/deals-masthead";
import { DealsNowBanner } from "@/components/deals/deals-now-banner";
import { DealsTimeline } from "@/components/deals/deals-timeline";
import { DealsSeriesCarousel } from "@/components/deals/deals-series-carousel";
import { DealsSpotlightCarousel, type SpotlightSlide } from "@/components/deals/deals-spotlight-carousel";
import { SubscribeCard } from "@/components/newsletter/subscribe-card";
import { getDealsArticles, getDealsData, getGuideLinks } from "@/lib/deals";
import { AMAZON_DEALS_ID, HOLIDAYS, buildCategoryRows, buildItemListJsonLd, buildSeries, coverFor, hasProductImage, isDealsActive } from "@/lib/deals-core";

// Built at most once an hour; the data is cached for 6 hours, so a visit adds
// no database reads.
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");
const SPOTLIGHT_TYPES = 6; // product types in the featured carousel

export const metadata: Metadata = {
  title: "Holiday Deals 2026: Top Picks for Every Sale and Gift | Phugialy Deals",
  description:
    "Top picks for Thanksgiving, Black Friday, Cyber Monday, Christmas and the New Year, one list for each, from computers and audio to home and gifts, plus featured deals. Refreshed daily.",
  alternates: { canonical: `${SITE}/deals` },
  openGraph: {
    type: "website",
    url: `${SITE}/deals`,
    title: "Holiday Deals 2026: Top Picks for Every Sale and Gift",
    description: "Popular holiday picks by category and by holiday, with the products readers open most up front. Rotated and refreshed daily.",
  },
};

export default async function DealsPage() {
  // After the season the section sends visitors to the permanent resources page.
  if (!isDealsActive()) redirect("/resources");

  const [data, articles, guideLinks] = await Promise.all([getDealsData(), getDealsArticles(12), getGuideLinks()]);
  const covers = Object.fromEntries(HOLIDAYS.map((h) => [h.slug, coverFor(data.holidays[h.slug] ?? [])]));
  const series = buildSeries(articles, 8, covers);
  // One slide per product type (the same rows as the category section below): its lead pick
  // and four more. The lead is the row's first product with a real picture.
  const slides: SpotlightSlide[] = buildCategoryRows(data.explorer)
    .filter((row) => row.slug !== "more" && row.items.length >= 3)
    .slice(0, SPOTLIGHT_TYPES)
    .map((row) => ({ slug: row.slug, label: row.label, blurb: row.blurb, total: row.items.length, items: row.items.slice(0, 5) }));
  const leads = slides.map((slide) => slide.items[0]);
  // The Amazon deals placement: shown only when the Amazon deal exists (it needs our Associate tag).
  const amazonDeal = data.deals.find((deal) => deal.id === AMAZON_DEALS_ID);
  const otherDeals = data.deals.filter((deal) => deal.id !== AMAZON_DEALS_ID);
  const bannerPhotos = leads.filter((p) => hasProductImage(p.image_url)).slice(0, 3).map((p) => ({ src: p.image_url!, alt: p.name }));
  const updated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  const jsonLd = buildItemListJsonLd({
    name: "Holiday Deals 2026: featured picks by product type",
    url: `${SITE}/deals`,
    items: leads.map((p) => ({ name: p.name, anchor: `p-${p.id}` })),
  });

  return (
    <>
      <Navigation />
      <DealsMasthead />
      <DealsClickTracker />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        {leads.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}
        <div className="mx-auto max-w-6xl">
          {/* Left: what this page is. Right: the big Amazon deals placement (below the text on a phone). */}
          <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
            <header className="flex flex-col justify-center">
              <h1 className="font-display text-4xl font-bold leading-[1.1] md:text-5xl">Holiday deals and top picks, refreshed daily.</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85 md:text-lg">
                Popular products this holiday season, in Top 10 lists by niche and holiday. The first picks are what readers opened
                most in the last week and the rest rotate daily.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Not lab tests, and no prices here, because prices change daily. Refreshed {updated}.
              </p>
            </header>
            {amazonDeal && <AmazonDealsBanner deal={amazonDeal} images={bannerPhotos} />}
          </div>
          {/* Right under the Amazon placement, so the disclosure sits next to the links it covers. */}
          <DealsDisclosure className="mt-6 max-w-3xl" />

          {/* The season in order: what is on now, and where it goes next. */}
          <div className="mt-10">
            <DealsNowBanner lists={data.holidays} />
          </div>
          <DealsTimeline className="mt-4" />

          <section aria-labelledby="series" className="mt-12">
            <h2 id="series" className="font-display text-2xl font-bold">
              Top 10 series
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              One list per niche and holiday. Open one to see the ten products and why they made it.
            </p>
            <DealsSeriesCarousel cards={series} />
          </section>

          {slides.length > 0 && (
            <section aria-labelledby="featured" className="mt-14">
              <h2 id="featured" className="font-display text-2xl font-bold">
                Featured by product type
              </h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">A lead pick and four more from each kind of product. Rotated daily.</p>
              <DealsSpotlightCarousel slides={slides} guideLinks={guideLinks} />
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
              <DealsCatalog items={data.explorer} guideLinks={guideLinks} />
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

          {otherDeals.length > 0 && (
            <section aria-labelledby="featured-deals" className="mt-14">
              <h2 id="featured-deals" className="font-display text-2xl font-bold">
                More offers
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {otherDeals.map((deal) => (
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
