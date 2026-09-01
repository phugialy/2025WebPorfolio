import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, FileText } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { AffiliateDisclosure } from "@/components/affiliate/affiliate-product-card";
import {
  getActiveAffiliateProduct,
  getArticlesForResource,
  getRelatedResources,
} from "@/lib/affiliate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getActiveAffiliateProduct(id);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description || `${product.name} — referenced on Phu Gia Ly's notes.`,
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getActiveAffiliateProduct(id);

  if (!product) {
    notFound();
  }

  const [referencedIn, relatedResources] = await Promise.all([
    getArticlesForResource(product.id),
    getRelatedResources(product),
  ]);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(
    /\/$/,
    ""
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Resources", item: `${siteUrl}/resources` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteUrl}/resources/${product.id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-3xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/resources" className="hover:text-foreground">
              Resources
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground line-clamp-1">{product.name}</span>
          </nav>

          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            {product.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-40 w-40 flex-none self-center rounded-2xl border bg-white object-contain p-3 sm:self-start"
              />
            )}
            <header className="min-w-0 flex-1">
              <span className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {product.network === "amazon" ? "Amazon" : product.brand || "Recommended"}
                {product.category ? ` · ${product.category}` : ""}
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
                {product.name}
              </h1>
              {product.description && (
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}
            </header>
          </div>

          {product.tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <a
            href={`/api/affiliate/go/${product.id}?ref=resources-page`}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mb-10 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Visit {product.name}
            <ExternalLink className="h-4 w-4" />
          </a>

          {referencedIn.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                <FileText className="h-4 w-4 text-primary" />
                Referenced in
              </h2>
              <div className="grid gap-2">
                {referencedIn.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {article.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {relatedResources.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-display text-lg font-bold">Related resources</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedResources.map((related) => (
                  <Link
                    key={related.id}
                    href={`/resources/${related.id}`}
                    className="flex gap-3 rounded-xl border bg-card p-4 text-sm transition-colors hover:border-primary/50"
                  >
                    {related.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={related.image_url}
                        alt={related.name}
                        className="h-12 w-12 flex-none rounded-lg bg-white object-contain p-0.5"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="font-display font-bold">{related.name}</span>
                      {related.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {related.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <AffiliateDisclosure />
        </div>
      </main>
    </>
  );
}
