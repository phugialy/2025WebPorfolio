import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsDisclosure } from "@/components/deals/deals-disclosure";
import { DealsMasthead } from "@/components/deals/deals-masthead";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { SubscribeCard } from "@/components/newsletter/subscribe-card";
import { getDealsData, getGuideLinks } from "@/lib/deals";
import { DealsTimeline } from "@/components/deals/deals-timeline";
import { HOLIDAYS, buildItemListJsonLd, getHoliday, holidayStatuses, isDealsActive, listCategories } from "@/lib/deals-core";
import { PURCHASE_SIZE_LEGEND } from "@/lib/deals-size";

export const revalidate = 3600;

// The first three picks on a Top 10 page are the most-opened products in its lookback (see ANCHORS in
// lib/deals-core.ts), so this is true where it is used: until a pick has card facts it says why it leads.
const TOP_NOTE = "Among the picks readers opened most in the last week.";
export const dynamicParams = false;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");

export function generateStaticParams() {
  return HOLIDAYS.map((h) => ({ holiday: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ holiday: string }> }): Promise<Metadata> {
  const { holiday } = await params;
  const h = getHoliday(holiday);
  if (!h) return {};
  const url = `${SITE}/deals/${h.slug}`;
  return {
    title: h.seoTitle,
    description: h.seoDescription,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: h.seoTitle, description: h.seoDescription },
  };
}

export default async function HolidayDealsPage({ params }: { params: Promise<{ holiday: string }> }) {
  const { holiday } = await params;
  const h = getHoliday(holiday);
  if (!h) notFound();
  // After the season the section sends visitors to the permanent resources page.
  if (!isDealsActive()) redirect("/resources");

  const [data, guideLinks] = await Promise.all([getDealsData(), getGuideLinks()]);
  const list = data.holidays[h.slug] ?? [];
  const statuses = holidayStatuses();
  const status = statuses.find((s) => s.holiday.slug === h.slug)!;
  const days = status.daysToDate;
  const onNow = statuses.find((s) => s.phase === "now");
  const categories = listCategories(list);
  const updated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  // Guides that go deeper on products in this list (newest-guide-per-product
  // already resolved in guideLinks), each listed once.
  const relatedGuides = [...new Map(list.flatMap((p) => (guideLinks[p.id] ? [[guideLinks[p.id].slug, guideLinks[p.id]] as const] : []))).values()].slice(0, 3);

  const url = `${SITE}/deals/${h.slug}`;
  const itemList = buildItemListJsonLd({
    name: h.h1,
    url,
    items: list.map((p) => ({ name: p.name, anchor: `p-${p.id}` })),
  });
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Deals", item: `${SITE}/deals` },
      { "@type": "ListItem", position: 3, name: h.name, item: url },
    ],
  };

  return (
    <>
      <Navigation />
      <DealsMasthead active={h.slug} />
      <DealsClickTracker />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
        {list.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
        )}
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
            <span className="text-foreground">{h.name}</span>
          </nav>

          <header>
            {/* The holiday's own color, fixed light-on-dark so it reads the same in both themes. */}
            <div
              data-holiday-hero={h.slug}
              className="overflow-hidden rounded-3xl p-6 text-white md:p-10"
              style={{ background: `linear-gradient(135deg, ${h.theme.deep}, ${h.theme.accent})` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-900">
                  {status.phase === "now" && (
                    <span aria-hidden="true" className="h-2 w-2 rounded-full motion-safe:animate-pulse" style={{ background: h.theme.accent }} />
                  )}
                  {status.label}
                </span>
                {days > 0 && status.phase !== "ended" && (
                  <span className="text-sm font-medium text-white/90">
                    {h.name} is in {days} {days === 1 ? "day" : "days"}
                  </span>
                )}
                {days === 0 && <span className="text-sm font-medium text-white/90">{h.name} is today</span>}
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">{h.h1}</h1>
              <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-white">{h.intent}</p>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/85">{h.intro}</p>
              {categories.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold tracking-wide text-white/80">In this list</p>
                  <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
                    {categories.map((c) => (
                      <li key={c} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {status.phase === "ended" && (
              <p className="mt-4 max-w-3xl rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                This holiday has passed, so its sales may be over. The list stays up as a reference.
                {onNow && (
                  <>
                    {" "}
                    <Link href={`/deals/${onNow.holiday.slug}`} className="font-semibold underline underline-offset-2">
                      See {onNow.holiday.name}, on now
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
            <div className="mt-5 max-w-3xl">
              <p className="text-xs text-muted-foreground">Not lab tests. Refreshed {updated}.</p>
              <DealsDisclosure className="mt-4" />
              <p className="mt-3 text-xs text-muted-foreground">{PURCHASE_SIZE_LEGEND}</p>
            </div>
          </header>

          {list.length > 0 ? (
            <section aria-label={h.h1} className="mt-10">
              {/* Size follows rank: the lead pick is a hero, the next two are feature cards, the rest are tiles (rows on a phone). */}
              <ol className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 md:grid-cols-6">
                {list.map((product, index) => {
                  const tier = index === 0 ? "hero" : index < 3 ? "feature" : "tile";
                  return (
                    <li
                      key={product.id}
                      className={tier === "hero" ? "sm:col-span-2 md:col-span-6" : tier === "feature" ? "md:col-span-3" : "col-span-1 sm:col-span-1 md:col-span-2"}
                    >
                      {tier === "hero" ? (
                        <DealsProductCard product={product} refSlug={h.slug} rank={index + 1} guide={guideLinks[product.id]} layout="hero" note={TOP_NOTE} />
                      ) : tier === "feature" ? (
                        <DealsProductCard product={product} refSlug={h.slug} rank={index + 1} guide={guideLinks[product.id]} layout="stack" large note={TOP_NOTE} />
                      ) : (
                        <DealsProductCard product={product} refSlug={h.slug} rank={index + 1} guide={guideLinks[product.id]} layout="stack" dense />
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="mt-10 text-sm text-muted-foreground">
              This list is being refreshed. See the full{" "}
              <Link href="/deals" className="underline underline-offset-2 hover:text-foreground">
                Deals page
              </Link>
              .
            </p>
          )}

          {list.length > 0 && (
            <section aria-labelledby="next-steps" className="mt-14 max-w-3xl">
              <h2 id="next-steps" className="font-display text-xl font-bold">
                Before you buy
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Prices and stock change daily. Open the product on Amazon to see today&apos;s price and the delivery date.</li>
                <li>Match the exact model: the same name often covers several versions with different ports, memory or screen size.</li>
                <li>Check that it works with what you already own: laptop ports, desk space, operating system.</li>
              </ul>
              {relatedGuides.length > 0 && (
                <>
                  <h3 className="mt-6 font-display text-base font-bold">Read next</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {relatedGuides.map((guide) => (
                      <li key={guide.slug}>
                        <Link href={`/blog/${guide.slug}`} data-deals-guide={guide.slug} className="font-semibold text-primary underline-offset-4 hover:underline">
                          {guide.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <section aria-labelledby="more-lists" className="mt-14">
            <h2 id="more-lists" className="font-display text-xl font-bold">
              The holiday sequence
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">One list for each stop in the season, in order.</p>
            <DealsTimeline active={h.slug} />
            <Link
              href="/deals"
              className="mt-4 inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:border-primary/60"
            >
              All deals
            </Link>
          </section>

          <SubscribeCard source="deals-page" className="mt-14 max-w-3xl" />
        </div>
      </main>
    </>
  );
}
