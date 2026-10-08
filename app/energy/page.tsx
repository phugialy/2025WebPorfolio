import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { ArticleNewsCard } from "@/components/blog/article-news-card";
import { AmbitSaveCallout } from "@/components/ambit/ambit-save-callout";
import { getAmbitPartner } from "@/lib/ambit";
import { isEnergyArticle } from "@/lib/ambit-brand";
import { logAffiliateImpression } from "@/lib/affiliate";
import { getPublishedPosts } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Energy",
  description:
    "Notes on electricity, the power grid, and what energy demand means for the people paying the bill.",
};

const AMBIT_REF = "energy-hub";

export default async function EnergyPage() {
  const [posts, ambit] = await Promise.all([getPublishedPosts(), getAmbitPartner()]);
  const energyPosts = posts.filter((post) => isEnergyArticle({ title: post.title, tags: post.tags }));

  if (ambit) {
    const requestUserAgent = (await headers()).get("user-agent");
    try {
      await logAffiliateImpression({
        productId: ambit.id,
        articleSlug: AMBIT_REF,
        userAgent: requestUserAgent || undefined,
      });
    } catch (error) {
      console.error("Error logging energy-hub impression:", error);
    }
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
            <span className="text-foreground">Energy</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Hub</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">Energy</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Electricity, the power grid, and what rising demand means for the people paying the
              bill.
            </p>
          </header>

          {ambit && (
            <div className="mb-10">
              <AmbitSaveCallout product={ambit} refId={AMBIT_REF} variant="banner" />
            </div>
          )}

          {energyPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published notes in this hub yet.</p>
          ) : (
            <div className="grid gap-5">
              {energyPosts.map((post) => (
                <ArticleNewsCard key={post._id} post={post} variant="feed" />
              ))}
            </div>
          )}

          <Link
            href="/blog"
            className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Browse all notes
          </Link>
        </div>
      </main>
    </>
  );
}
