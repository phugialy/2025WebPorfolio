import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Navigation } from "@/components/navigation";
import { AffiliateDisclosure } from "@/components/affiliate/affiliate-product-card";
import { ResourcesTabs } from "@/components/resources/resources-tabs";
import { listActiveResources, logAffiliateImpression, type AffiliateProduct } from "@/lib/affiliate";

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
  const resources = await listActiveResources();
  const gear = groupByCategory(resources.filter((r) => !isBook(r)));
  const reading = groupByCategory(resources.filter((r) => isBook(r)));

  // Every card on this page is a real impression -- logAffiliateClick fires
  // from the /api/affiliate/go redirect regardless of which page a click
  // came from, but until now only the article Pick rail logged the matching
  // impression. That gap made CTR look impossible (over 100% on some
  // products) because clicks from here had no denominator at all.
  const requestUserAgent = (await headers()).get("user-agent");
  try {
    await Promise.all(
      resources.map((resource) =>
        logAffiliateImpression({
          productId: resource.id,
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
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-5xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Resources</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Resources
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              Worth knowing about
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Everything here has come up in an actual note, not just a listicle. Browse by
              category, or find the article that explains why it made the list.
            </p>
          </header>

          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources listed yet.</p>
          ) : (
            <ResourcesTabs gear={gear} reading={reading} />
          )}

          <AffiliateDisclosure className="mt-12" />
        </div>
      </main>
    </>
  );
}
