import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Navigation } from "@/components/navigation";
import { getPublishedThreadById } from "@/lib/threads";
import { formatDate } from "@/lib/utils";
import { sanitizeMdxContent } from "@/lib/mdx-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await getPublishedThreadById(id);
  if (!thread) return {};

  return {
    title: thread.title || "Field Note",
    description: thread.body.slice(0, 160),
  };
}

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await getPublishedThreadById(id);

  if (!thread) {
    notFound();
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(
    /\/$/,
    ""
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: thread.title || thread.body.slice(0, 80),
    articleBody: thread.body,
    datePublished: thread.published_at || thread.created_at,
    author: { "@type": "Person", name: "Phu Gia Ly" },
    mainEntityOfPage: `${siteUrl}/threads/${thread.id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-2xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/threads" className="hover:text-foreground">
              Field Notes
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{formatDate(thread.published_at || thread.created_at)}</span>
          </nav>

          <article className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
              Field Note
              <time
                dateTime={thread.published_at || thread.created_at}
                className="font-normal normal-case text-muted-foreground"
              >
                · {formatDate(thread.published_at || thread.created_at)}
              </time>
            </div>
            {thread.title && (
              <h1 className="mt-2 font-display text-2xl font-bold leading-tight">
                {thread.title}
              </h1>
            )}
            <div className="prose mt-4 max-w-none">
              <MDXRemote source={sanitizeMdxContent(thread.body)} />
            </div>

            {thread.articles && (
              <Link
                href={`/blog/${thread.articles.slug}`}
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Related: {thread.articles.title} →
              </Link>
            )}

            {thread.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {thread.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {thread.affiliate_products && (
              <Link
                href={`/resources/${thread.affiliate_products.id}`}
                className="mt-6 flex items-center gap-3 rounded-xl border bg-background/60 p-4 transition-colors hover:border-primary/50"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Mentioned
                  </div>
                  <div className="font-display font-bold">{thread.affiliate_products.name}</div>
                </div>
              </Link>
            )}
          </article>

          <Link
            href="/threads"
            className="mt-8 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            ← All Field Notes
          </Link>
        </div>
      </main>
    </>
  );
}
