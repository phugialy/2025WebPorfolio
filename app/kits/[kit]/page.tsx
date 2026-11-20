import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsDisclosure } from "@/components/deals/deals-disclosure";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { SubscribeCard } from "@/components/newsletter/subscribe-card";
import { buildItemListJsonLd } from "@/lib/deals-core";
import { KITS, getKit, kitIsReady, kitRefSlug } from "@/lib/kits-core";
import { getKitProducts } from "@/lib/kits";

export const revalidate = 3600;
export const dynamicParams = false;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");

export function generateStaticParams() {
  return KITS.map((k) => ({ kit: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ kit: string }> }): Promise<Metadata> {
  const { kit: slug } = await params;
  const kit = getKit(slug);
  if (!kit) return {};
  const url = `${SITE}/kits/${kit.slug}`;
  // A kit with too few active products is not worth indexing yet.
  const ready = kitIsReady((await getKitProducts(kit.slug)).length);
  return {
    title: kit.seoTitle,
    description: kit.seoDescription,
    alternates: { canonical: url },
    robots: ready ? undefined : { index: false, follow: true },
    openGraph: { type: "article", url, title: kit.seoTitle, description: kit.seoDescription },
  };
}

export default async function KitPage({ params }: { params: Promise<{ kit: string }> }) {
  const { kit: slug } = await params;
  const kit = getKit(slug);
  if (!kit) notFound();

  const products = await getKitProducts(kit.slug);
  const url = `${SITE}/kits/${kit.slug}`;
  const itemList = buildItemListJsonLd({
    name: kit.h1,
    url,
    items: products.map((p) => ({ name: p.name, anchor: `p-${p.id}` })),
  });
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Kits", item: `${SITE}/kits` },
      { "@type": "ListItem", position: 3, name: kit.name, item: url },
    ],
  };
  const others = KITS.filter((k) => k.slug !== kit.slug);

  return (
    <>
      <Navigation />
      <DealsClickTracker />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
        {products.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />}
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/kits" className="hover:text-foreground">
              Kits
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{kit.name}</span>
          </nav>

          <header>
            <div
              data-kit-hero={kit.slug}
              className="overflow-hidden rounded-3xl p-6 text-white md:p-10"
              style={{ background: `linear-gradient(135deg, ${kit.theme.deep}, ${kit.theme.accent})` }}
            >
              <p className="text-xs font-semibold tracking-wide text-white/80">Kit of {products.length > 0 ? products.length : 10}</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">{kit.h1}</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/90">{kit.intro}</p>
              {kit.articleSlug && (
                <p className="mt-4">
                  <Link href={`/blog/${kit.articleSlug}`} className="font-semibold text-white underline underline-offset-4">
                    Read the article that goes with this kit
                  </Link>
                </p>
              )}
            </div>
            <div className="mt-5 max-w-3xl">
              <p className="text-xs text-muted-foreground">Not lab tests. The kit stays up all year; only the picks change.</p>
              <DealsDisclosure className="mt-4" />
            </div>
          </header>

          {products.length > 0 ? (
            <section aria-label={kit.h1} className="mt-10">
              <ol className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 md:grid-cols-6">
                {products.map((product, index) => {
                  const tier = index === 0 ? "hero" : index < 3 ? "feature" : "tile";
                  const layoutClass =
                    tier === "hero" ? "sm:col-span-2 md:col-span-6" : tier === "feature" ? "md:col-span-3" : "col-span-1 sm:col-span-1 md:col-span-2";
                  return (
                    <li key={product.id} className={layoutClass}>
                      {tier === "hero" ? (
                        <DealsProductCard product={product} refSlug={kitRefSlug(kit)} rank={index + 1} layout="hero" note={product.role} />
                      ) : tier === "feature" ? (
                        <DealsProductCard product={product} refSlug={kitRefSlug(kit)} rank={index + 1} layout="stack" large note={product.role} />
                      ) : (
                        <DealsProductCard product={product} refSlug={kitRefSlug(kit)} rank={index + 1} layout="stack" dense note={product.role} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="mt-10 max-w-3xl text-sm text-muted-foreground">This kit is being put together. Check back soon, or look at the other kits below.</p>
          )}

          <section aria-labelledby="before-you-buy" className="mt-14 max-w-3xl">
            <h2 id="before-you-buy" className="font-display text-xl font-bold">
              Before you buy
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Prices and stock change daily. Open the product on Amazon to see today&apos;s price and the delivery date.</li>
              <li>Match the exact model: the same name often covers several versions with different ports, sizes or memory.</li>
              <li>Check that each piece works with what you already own.</li>
            </ul>
          </section>

          <section aria-labelledby="more-kits" className="mt-14">
            <h2 id="more-kits" className="font-display text-xl font-bold">
              More kits
            </h2>
            <ul className="mt-3 flex list-none flex-wrap gap-3 p-0 text-sm">
              {others.map((k) => (
                <li key={k.slug}>
                  <Link href={`/kits/${k.slug}`} className="inline-block rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted">
                    {k.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <SubscribeCard className="my-14" />
        </div>
      </main>
    </>
  );
}
