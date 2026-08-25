import Link from "next/link";
import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { AffiliateDisclosure } from "@/components/affiliate/affiliate-product-card";
import { listActiveResources } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources",
  description: "Things referenced across Phu Gia Ly's notes on AI, automation, and software workflows.",
};

export default async function ResourcesPage() {
  const resources = await listActiveResources();

  const categories = new Map<string, typeof resources>();
  for (const resource of resources) {
    const key = resource.category || "Uncategorized";
    const bucket = categories.get(key) || [];
    bucket.push(resource);
    categories.set(key, bucket);
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
            <div className="grid gap-10">
              {Array.from(categories.entries()).map(([category, items]) => (
                <section key={category}>
                  <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
                    <Tag className="h-4 w-4 text-primary" />
                    {category}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((resource) => (
                      <Link
                        key={resource.id}
                        href={`/resources/${resource.id}`}
                        className="group block rounded-2xl border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
                      >
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {resource.network === "amazon" ? "Amazon" : resource.brand || "Recommended"}
                        </span>
                        <h3 className="mt-1 font-display text-lg font-bold transition-colors group-hover:text-primary">
                          {resource.name}
                        </h3>
                        {resource.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {resource.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <AffiliateDisclosure className="mt-12" />
        </div>
      </main>
    </>
  );
}
