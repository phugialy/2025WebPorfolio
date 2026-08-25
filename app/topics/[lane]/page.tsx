import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";
import { getPublishedPosts } from "@/lib/articles";
import { getLaneBySlug, LANES } from "@/lib/lanes";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LANES.map((lane) => ({ lane: lane.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lane: string }>;
}): Promise<Metadata> {
  const { lane: laneSlug } = await params;
  const lane = getLaneBySlug(laneSlug);
  if (!lane) return {};

  return {
    title: `${lane.label} | Phu Gia Ly`,
    description: lane.description,
  };
}

async function TopicContent({ laneSlug }: { laneSlug: string }) {
  const lane = getLaneBySlug(laneSlug);
  if (!lane) notFound();

  const posts = await getPublishedPosts();
  const lanePosts = posts.filter((post) => getArticleLane(post) === lane.value);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(
    /\/$/,
    ""
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: lane.label,
        item: `${siteUrl}/topics/${lane.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            <span className="text-foreground">{lane.label}</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Hub
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              {lane.label}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {lane.description}
            </p>
          </header>

          {lanePosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published notes in this hub yet.
            </p>
          ) : (
            <div className="grid gap-5">
              {lanePosts.map((post) => (
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

export default async function TopicPage({
  params,
}: {
  params: Promise<{ lane: string }>;
}) {
  const { lane: laneSlug } = await params;

  return (
    <ConvexClientProvider>
      <Navigation />
      <TopicContent laneSlug={laneSlug} />
    </ConvexClientProvider>
  );
}
