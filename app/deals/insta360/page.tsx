import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { BrandTrendChart } from "@/components/deals/brand-trend-chart";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsImpression } from "@/components/deals/deals-impression";
import { getInsta360Page, type AccessoryCard, type BrandCard } from "@/lib/brand-pages";
import {
  INSTA360_CHECKED,
  INSTA360_GROUPS,
  INSTA360_REF_SLUG,
  MARKET_SOURCES,
  busiestMonth,
  fallShare,
  holidayLift,
  monthName,
  percent,
  times,
  type Source,
} from "@/lib/brands/insta360";
import { buildItemListJsonLd, dealsRef, goHref } from "@/lib/deals-core";

export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");
const PAGE_URL = `${SITE}/deals/insta360`;
const TITLE = "Is Insta360 Worth It? Which Model to Buy, Checked | Phugialy";
const DESCRIPTION =
  "Insta360's 360 cameras, Luna pocket gimbals, action cameras and accessories, checked against US search data and independent reviews: who each one is for and when to skip it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: "article", url: PAGE_URL, title: TITLE, description: DESCRIPTION },
};

function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <span>
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ", "}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {s.label}
          </a>
        </span>
      ))}
    </span>
  );
}

function PickCard({ card, rank }: { card: BrandCard; rank: number }) {
  const ref = dealsRef(INSTA360_REF_SLUG);
  return (
    <article id={`p-${card.product.id}`} className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <DealsImpression productId={card.product.id} refLabel={ref} />
      <div className="relative flex aspect-[4/3] items-center justify-center bg-white p-6">
        {card.product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.product.image_url} alt={card.title} loading="lazy" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-sm text-neutral-500">{card.title}</span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
          {card.role}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold leading-snug">{card.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{card.what}</p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Good buy if</dt>
            <dd className="mt-1 leading-relaxed">{card.goodIf}</dd>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skip if</dt>
            <dd className="mt-1 leading-relaxed">{card.skipIf}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">What reviewers say: </span>
          {card.reviewers} <span className="whitespace-nowrap">(<SourceLinks sources={card.sources} />)</span>
        </p>
        <div className="mt-auto pt-5">
          <a
            href={goHref(card.product.id, INSTA360_REF_SLUG)}
            data-deals-product={card.product.id}
            data-deals-name={card.product.name}
            data-deals-ref={ref}
            data-deals-rank={rank}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-[#ffd400] dark:text-neutral-950 dark:hover:bg-[#ffe14d]"
          >
            See it at the Insta360 store
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab): {card.title}</span>
          </a>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Prices and bundles change often. Check them on the store.</p>
        </div>
      </div>
    </article>
  );
}

function AccessoryTile({ card, rank }: { card: AccessoryCard; rank: number }) {
  const ref = dealsRef(INSTA360_REF_SLUG);
  return (
    <article id={`p-${card.product.id}`} className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <DealsImpression productId={card.product.id} refLabel={ref} />
      <div className="flex aspect-square items-center justify-center bg-white p-5">
        {card.product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.product.image_url} alt={card.title} loading="lazy" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-sm text-neutral-500">{card.title}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="font-display text-base font-bold leading-snug">{card.title}</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{card.forWhat}</p>
        <p className="mt-2 text-xs text-muted-foreground">Fits: {card.fits.join(", ")}</p>
        {card.storeRating && (
          <p className="mt-1 text-xs text-muted-foreground">
            Store rating {card.storeRating.avg.toFixed(1)} from {card.storeRating.count} reviews
          </p>
        )}
        <div className="mt-auto pt-4">
          <a
            href={goHref(card.product.id, INSTA360_REF_SLUG)}
            data-deals-product={card.product.id}
            data-deals-name={card.product.name}
            data-deals-ref={ref}
            data-deals-rank={rank}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See it at the store
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab): {card.title}</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export default async function Insta360Page() {
  const { cards, accessoryGroups } = await getInsta360Page();
  const byPath = new Map(cards.map((c) => [c.storePath, c]));
  let rank = 0;

  const lift = holidayLift(2025, "insta360");
  const goproLift = holidayLift(2025, "gopro");
  const osmoLift = holidayLift(2025, "djiOsmo");
  const shareNow = fallShare(2026, "gopro");
  const shareThen = fallShare(2023, "gopro");
  const peak = busiestMonth(2025, "insta360");

  const stats = [
    {
      value: times(lift),
      label: `Insta360 searches in November and December 2025, against its own yearly average. GoPro's: ${times(goproLift)}.`,
    },
    {
      value: percent(shareNow),
      label: `Insta360's US search interest this fall as a share of GoPro's. In fall 2023 it was ${percent(shareThen)}.`,
    },
    { value: "67%", label: "Insta360's share of global consumer 360-camera sales in 2023, by Frost & Sullivan's count." },
    { value: "Cleared", label: "A US trade ruling in February 2026 left the current lineup on sale; only older Ace designs were barred." },
  ];

  const jsonLd = buildItemListJsonLd({
    name: "Insta360: which model to buy",
    url: PAGE_URL,
    items: cards.map((c) => ({ name: c.title, anchor: `p-${c.product.id}` })),
  });

  return (
    <>
      <Navigation />
      <DealsClickTracker />
      <main className="min-h-screen bg-background px-4 py-8 text-foreground md:py-12">
        {cards.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/deals" className="hover:text-foreground">
              Deals
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Insta360</span>
          </nav>

          <header data-brand-hero="insta360" className="relative overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white md:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-[#ffd400]/80 md:h-96 md:w-96 md:border-[36px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full border-[10px] border-white/10 md:h-48 md:w-48" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd400]">Brand check · {INSTA360_CHECKED}</p>
            <h1 className="relative mt-3 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.08] md:text-6xl">
              Is Insta360 worth it? We dug into the market.
            </h1>
            <p className="relative mt-5 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
              Insta360 leads in 360 cameras and sells a pocket gimbal you can buy in the US. Below: what the search data and
              independent reviews say, and which model fits whom, including when to skip one.
            </p>
            <dl className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.value} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                  <dt className="font-display text-3xl font-bold tabular-nums text-[#ffd400] md:text-4xl">{s.value}</dt>
                  <dd className="mt-2 text-sm leading-snug text-white/80">{s.label}</dd>
                </div>
              ))}
            </dl>
            <a
              href="#picks"
              className="relative mt-8 inline-flex min-h-11 items-center rounded-md bg-[#ffd400] px-5 text-sm font-semibold text-neutral-950 transition hover:bg-[#ffe14d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              See which model fits you
            </a>
          </header>

          <p className="mt-5 max-w-3xl rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            An independent page, not run by Insta360. We earn a commission when you buy through these links to Insta360&apos;s
            store, at no extra cost to you. It does not change what we say: every pick below has a reason to skip it.{" "}
            <Link href="/disclosure" className="underline underline-offset-2 hover:text-foreground">
              Full disclosure
            </Link>
            .
          </p>

          <section aria-labelledby="verdict" className="mt-12 grid gap-4 md:grid-cols-3">
            <h2 id="verdict" className="sr-only">
              Our read
            </h2>
            {[
              { head: "360 video: yes", body: "This is Insta360's strongest ground and the reviews agree. Start with the X5; the X6 if you film at night." },
              { head: "Pocket vlogging in the US: yes", body: "DJI's newest Osmo Pocket is not officially sold here. The Luna Pro is, and it reviews well." },
              { head: "Plain action camera: a close call", body: "The Ace Pro 2 trades blows with GoPro and DJI. Pick it for the flip screen, not by default." },
            ].map((v) => (
              <div key={v.head} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-display text-lg font-bold">{v.head}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </section>

          <div id="picks" className="scroll-mt-24">
            {INSTA360_GROUPS.map((group) => {
              const groupCards = group.picks.map((p) => byPath.get(p.storePath)).filter((c): c is BrandCard => Boolean(c));
              if (groupCards.length === 0) return null;
              return (
                <section key={group.id} aria-labelledby={`g-${group.id}`} className="mt-14">
                  <h2 id={`g-${group.id}`} className="font-display text-2xl font-bold md:text-3xl">
                    {group.heading}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{group.intro}</p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {groupCards.map((card) => (
                      <PickCard key={card.storePath} card={card} rank={++rank} />
                    ))}
                  </div>
                  {group.id === "vlogging" && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Comparing with DJI?{" "}
                      <Link href="/kits/osmo-pocket-3-creator-kit" className="font-semibold text-foreground underline underline-offset-4">
                        See our Osmo Pocket 3 creator kit
                      </Link>
                      .
                    </p>
                  )}
                </section>
              );
            })}
            {cards.length === 0 && (
              <p className="mt-12 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                The picks are being refreshed. Please check back shortly.
              </p>
            )}
          </div>

          {accessoryGroups.length > 0 && (
            <section aria-labelledby="accessories" className="mt-16">
              <h2 id="accessories" className="font-display text-2xl font-bold md:text-3xl">
                Accessories worth adding
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                For each camera above, the accessories Insta360&apos;s store sells most of that fit it. Ratings are the
                store&apos;s own and shown only with 10 or more reviews. Check that it fits your exact model before you buy.
              </p>
              {accessoryGroups.map((group) => (
                <div key={group.id} className="mt-8">
                  <h3 className="font-display text-lg font-bold">{group.heading}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {group.cards.map((card) => (
                      <AccessoryTile key={card.storePath} card={card} rank={++rank} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section aria-labelledby="market" className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 id="market" className="font-display text-2xl font-bold">
                The market, in searches
              </h2>
              <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
                How often people in the US searched each brand, month by month for five years.
              </p>
              <BrandTrendChart />
            </div>
            <div className="text-sm leading-relaxed">
              <h3 className="font-display text-lg font-bold">What we read from it</h3>
              <ul className="mt-3 grid list-disc gap-3 pl-5 text-foreground/85">
                <li>
                  Insta360 is a gift brand. Its searches rose to {times(lift)} its yearly average last November and December,
                  and {peak ? monthName(peak) : "December"} was its busiest month of 2025. DJI Osmo did the same ({times(osmoLift)});
                  GoPro did not move ({times(goproLift)}).
                </li>
                <li>
                  It is closing on GoPro: from {percent(shareThen)} of GoPro&apos;s search interest in fall 2023 to{" "}
                  {percent(shareNow)} this fall.
                </li>
                <li>
                  Spring 2026 was launch season (GoPro&apos;s MISSION 1 in April, Insta360&apos;s Luna in June) and every brand
                  jumped. That has settled: this fall Insta360 sits a little below last fall, and DJI Osmo is searched slightly
                  more.
                </li>
                <li>
                  The company is growing, not fading: it listed on Shanghai&apos;s STAR Market in June 2025 and held about 67% of
                  global consumer 360-camera sales in 2023.
                </li>
                <li>
                  The GoPro patent fight is mostly over for buyers: the US trade commission found no infringement of GoPro&apos;s
                  utility patents and barred only older Ace designs, not the current lineup.
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Sources:{" "}
                <SourceLinks
                  sources={[MARKET_SOURCES.trends, MARKET_SOURCES.share, MARKET_SOURCES.ipo, MARKET_SOURCES.itc, MARKET_SOURCES.itc2, MARKET_SOURCES.launches]}
                />
                .
              </p>
            </div>
          </section>

          <section aria-labelledby="how" className="mt-14 max-w-3xl">
            <h2 id="how" className="font-display text-xl font-bold">
              How we checked
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Product facts come from Insta360&apos;s store pages. The verdicts summarize independent reviews, linked on each card;
              where we found none, the card says so. Search numbers are Google Trends for the US. Not lab tests, and no prices,
              because prices and bundles change daily. Checked {INSTA360_CHECKED}; we update this page when new models or reviews
              land. Older models (X3, X4, ONE RS) are left out because newer ones replace them.
            </p>
            <p className="mt-4 text-sm">
              <Link href="/deals" className="font-semibold underline underline-offset-4">
                Back to all deals
              </Link>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
