import type { Metadata } from "next";
import { headers } from "next/headers";
import { BookOpen, Compass, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { AffiliateDisclosure } from "@/components/affiliate/affiliate-product-card";
import { ResourcesTabs } from "@/components/resources/resources-tabs";
import { PartnerSpotlight } from "@/components/resources/partner-spotlight";
import {
  getActivePartners,
  listActiveResources,
  logAffiliateImpression,
  type AffiliateProduct,
} from "@/lib/affiliate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources",
  description: "Things referenced across Phu Gia Ly's notes on AI, automation, and software workflows.",
};

function groupByCategory(items: AffiliateProduct[]) {
  const map = new Map<string, AffiliateProduct[]>();
  for (const item of items) {
    const key = item.category || "Uncategorized";
    const bucket = map.get(key) || [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

// Every discovered book is tagged "Books" (resource-discovery.ts) -- an
// already-consistent signal to split the reading list out from physical
// gear, instead of interleaving them as same-weight category sections on one
// long page.
function isBook(resource: AffiliateProduct) {
  return resource.tags.some((tag) => tag.toLowerCase() === "books");
}

export default async function ResourcesPage() {
  const [allResources, partners] = await Promise.all([listActiveResources(), getActivePartners()]);
  // Partners get their own spotlight above -- keep them out of the regular
  // grid too, rather than showing the same product twice on one page.
  const resources = allResources.filter((r) => !r.is_partner);
  const gear = groupByCategory(resources.filter((r) => !isBook(r)));
  const reading = groupByCategory(resources.filter((r) => isBook(r)));

  // Every card on this page is a real impression -- logAffiliateClick fires
  // from the /api/affiliate/go redirect regardless of which page a click
  // came from, but until now only the article Pick rail logged the matching
  // impression. That gap made CTR look impossible (over 100% on some
  // products) because clicks from here had no denominator at all.
  //
  // articleSlug must match the "resources-page" ref already hardcoded on the
  // outbound link in app/resources/[id]/page.tsx -- without it these rows
  // landed with a null article_slug, invisible to any per-source CTR
  // breakdown and only showing up as an unattributed "(none)" bucket.
  const requestUserAgent = (await headers()).get("user-agent");
  try {
    await Promise.all(
      allResources.map((resource) =>
        logAffiliateImpression({
          productId: resource.id,
          articleSlug: "resources-page",
          userAgent: requestUserAgent || undefined,
        })
      )
    );
  } catch (error) {
    console.error("Error logging resource-page impressions:", error);
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,0.5fr)] lg:py-20">
            <header>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Compass className="h-3.5 w-3.5" /> Resources</p>
              <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl">Worth knowing about, with a reason why.</h1>
            </header>
            <div className="self-end border-l border-primary pl-5 text-base leading-relaxed text-muted-foreground">
              These are tools, books, and partners that surfaced through actual notes and workflow questions. The context matters as much as the recommendation.
              <a href="#catalog" className="mt-5 flex w-fit items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary">Browse the catalog <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <div id="catalog" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="mb-10 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><BookOpen className="h-4 w-4" /> A considered shelf</div>

          <PartnerSpotlight partners={partners} />

          {resources.length === 0 ? (
            partners.length === 0 && <p className="text-sm text-muted-foreground">No resources listed yet.</p>
          ) : (
            <ResourcesTabs gear={gear} reading={reading} />
          )}

          <AffiliateDisclosure className="mt-12" />
        </div>
      </main>
    </>
  );
}
