import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Compass } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { getAllPosts, getPostBySlug, incrementPostViews } from "@/lib/articles";
import { buildFallbackInfoCards } from "@/lib/article-info-cards";
import { formatDate } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import { BlogPostTracker } from "@/components/blog/blog-post-tracker";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { ArticleShare } from "@/components/blog/article-share";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";

export const dynamic = "force-dynamic";

function getImageCaption(
  role: string,
  post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
  assetCaption?: string
) {
  if (assetCaption) return assetCaption;
  if (post.metadata?.heroImageCaption) return post.metadata.heroImageCaption;

  const normalizedRole = role.toLowerCase();
  const takeaway = post.metadata?.readerTakeaway || post.metadata?.readerPayoff;

  if (normalizedRole === "closing highlight visual") {
    return takeaway
      ? `Closing frame: ${takeaway}`
      : "Closing frame: the decision, risk, or workflow shift this article leaves with the reader.";
  }

  if (normalizedRole === "inside paper visual") {
    return post.metadata?.mainAngle
      ? `This visual supports the article's central angle: ${post.metadata.mainAngle}`
      : "This visual connects the article's idea to the workflow, decision, or tradeoff behind it.";
  }

  return (
    takeaway ||
    post.metadata?.mainAngle ||
    post.metadata?.readerHook ||
    "A visual entry point for the article's main decision, workflow, or business implication."
  );
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getShareQuote(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>) {
  if (post.metadata?.shareQuote) {
    return post.metadata.shareQuote.replace(/"/g, "'");
  }

  const article = stripMarkdown(post.content.replace(/^#\s+.+$/m, " "));
  const summary = stripMarkdown(post.metadata?.aiSummary || post.notes || "");
  const source = `${article} ${summary}`.trim();
  const weakPatterns = /^(phu explores|this article|this post|the article|in this note|i explore)\b/i;
  const hookPatterns =
    /\b(not|but|real|risk|trust|reliable|workflow|review|human|proof|guardrail|maturity|automation|teams?|businesses?|should|need)\b/i;
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length >= 70 &&
        sentence.length <= 190 &&
        !weakPatterns.test(sentence) &&
        hookPatterns.test(sentence)
    )
    .sort((a, b) => Number(hookPatterns.test(b)) - Number(hookPatterns.test(a)));

  const selected =
    sentences[0] ||
    `The real question behind ${post.title} is not whether the technology looks impressive. It is whether the workflow gives people something they can trust.`;

  return selected.replace(/"/g, "'");
}

function getPublicArticleUrl(slug: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  return `${siteUrl.replace(/\/$/, "")}/blog/${slug}`;
}

function getRelatedPosts(
  currentPost: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
  allPosts: Awaited<ReturnType<typeof getAllPosts>>
) {
  const currentLane = getArticleLane(currentPost);
  const currentTags = new Set(currentPost.tags || []);

  return allPosts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => {
      const sharedTags = (post.tags || []).filter((tag) => currentTags.has(tag)).length;
      const sameLane = getArticleLane(post) === currentLane ? 3 : 0;
      return { post, score: sameLane + sharedTags };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.post.createdAt - a.post.createdAt)
    .slice(0, 3)
    .map((item) => item.post);
}

function getAdjacentPosts(
  currentPost: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
  allPosts: Awaited<ReturnType<typeof getAllPosts>>
) {
  const posts = [...allPosts].sort((a, b) => b.createdAt - a.createdAt);
  const index = posts.findIndex((post) => post.slug === currentPost.slug);

  return {
    previousPost: index >= 0 ? posts[index + 1] : undefined,
    nextPost: index > 0 ? posts[index - 1] : undefined,
  };
}

function getRecentPosts(
  currentPost: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
  allPosts: Awaited<ReturnType<typeof getAllPosts>>
) {
  return [...allPosts]
    .filter((post) => post.slug !== currentPost.slug)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
}

function ReaderInsightPanel({
  post,
  infoCards,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>;
  infoCards: Array<{ label: string; title: string; body: string }>;
}) {
  const title =
    post.metadata?.mainAngle ||
    post.metadata?.readerTakeaway ||
    infoCards[0]?.title ||
    "Reader lens";
  const body =
    post.metadata?.readerPayoff ||
    post.metadata?.readerQuestion ||
    post.metadata?.readerEffect ||
    infoCards[0]?.body ||
    "This note is meant to give the reader a clearer way to judge the workflow, risk, or decision behind the topic.";

  return (
    <section className="mb-8 rounded-xl border bg-card/70 p-5">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Compass className="h-4 w-4" />
        Reader Lens
      </div>
      <h2 className="font-display text-xl font-bold leading-snug text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {body}
      </p>
    </section>
  );
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const description =
    post.metadata?.seoDescription ||
    post.metadata?.readerHook ||
    post.metadata?.aiSummary ||
    post.notes;

  return {
    title: post.title,
    description,
    keywords: post.tags,
    authors: [{ name: post.author || "Phu Gia Ly" }],
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: new Date(post.createdAt).toISOString(),
      images: post.metadata?.heroImageUrl ? [post.metadata.heroImageUrl] : undefined,
    },
    twitter: {
      card: post.metadata?.heroImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.metadata?.heroImageUrl ? [post.metadata.heroImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post;

  try {
    post = await getPostBySlug(slug);
  } catch (error) {
    console.error("Error fetching post:", error);
    post = null;
  }

  if (!post) {
    notFound();
  }

  const infoCards = post.metadata?.infoCards?.length
    ? post.metadata.infoCards.slice(0, 3)
    : buildFallbackInfoCards(post);
  const supportingImages = (post.metadata?.imageAssets || []).filter(
    (asset) =>
      asset.url !== post.metadata?.heroImageUrl &&
      !["hero image", "main thumbnail", "thumbnail", "hero card"].includes(
        asset.role.toLowerCase()
      )
  );
  const shareQuote = getShareQuote(post);
  const shareUrl = getPublicArticleUrl(post.slug);
  const allPosts = await getAllPosts();
  const relatedPosts = getRelatedPosts(post, allPosts);
  const recentPosts = getRecentPosts(post, allPosts);
  const { previousPost, nextPost } = getAdjacentPosts(post, allPosts);
  const lane = getArticleLane(post);
  const description =
    post.metadata?.seoDescription ||
    post.metadata?.readerHook ||
    post.metadata?.aiSummary ||
    post.notes ||
    "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    image: post.metadata?.heroImageUrl ? [post.metadata.heroImageUrl] : undefined,
    datePublished: new Date(post.publishDate || post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt || post.createdAt).toISOString(),
    author: {
      "@type": "Person",
      name: post.author || "Phu Gia Ly",
    },
    publisher: {
      "@type": "Person",
      name: "Phu Gia Ly",
    },
    keywords: post.tags,
    articleSection: lane,
    mainEntityOfPage: shareUrl,
    about: post.metadata?.mainAngle || post.metadata?.readerEffect || post.title,
  };

  try {
    await incrementPostViews(slug);
  } catch (error) {
    console.error("Error incrementing views:", error);
  }

  return (
    <ConvexClientProvider>
      <BlogPostTracker postSlug={slug}>
        <Navigation />
        <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <article className="mx-auto max-w-3xl">
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
            >
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <Link href="/blog" className="hover:text-foreground">
                Blog
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-foreground">{lane}</span>
            </nav>

            <header className="mb-10">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <time dateTime={new Date(post.createdAt).toISOString()}>
                    {formatDate(new Date(post.createdAt).toISOString())}
                  </time>
                  {post.metadata?.readTime && (
                    <>
                      <span aria-hidden="true">/</span>
                      <span>{post.metadata.readTime} min read</span>
                    </>
                  )}
                </div>
                <ArticleShare title={post.title} quote={shareQuote} url={shareUrl} />
              </div>

              <Link
                href="/blog"
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all posts
              </Link>

              <h1 className="mb-5 font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
                {post.title}
              </h1>

              {(post.metadata?.readerHook || post.metadata?.aiSummary) && (
                <p className="mb-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {post.metadata.readerHook || post.metadata.aiSummary}
                </p>
              )}

              {(post.metadata?.articleType || post.metadata?.intendedAudience) && (
                <div className="mb-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {post.metadata.articleType && (
                    <span className="rounded-full border border-border bg-muted/35 px-3 py-1">
                      {post.metadata.articleType}
                    </span>
                  )}
                  {post.metadata.intendedAudience && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                      For {post.metadata.intendedAudience}
                    </span>
                  )}
                </div>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-muted/35 px-3 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {post.metadata?.heroImageUrl && (
                <figure className="mb-8 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.metadata.heroImageUrl}
                    alt={
                      post.metadata.imageAssets?.[0]?.alt ||
                      post.metadata.imagePrompts?.[0]?.alt ||
                      post.title
                    }
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <figcaption className="border-t bg-background px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                    {getImageCaption("main thumbnail", post)}
                  </figcaption>
                </figure>
              )}

              <ReaderInsightPanel post={post} infoCards={infoCards} />
            </header>

            <div className="prose prose-lg max-w-none">
              <MDXRemote
                source={post.content}
                components={{
                  SourceCard: ({ children }: { children?: React.ReactNode }) => (
                    <div className="rounded-lg bg-muted p-4">{children}</div>
                  ),
                  TagList: ({ tags }: { tags?: string[] }) => (
                    <div className="my-4 flex flex-wrap gap-2">
                      {(tags || []).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ),
                }}
              />
            </div>

            {supportingImages.length > 0 && (
              <section className="my-10 grid gap-4">
                {supportingImages.map((asset) => (
                  <figure key={asset.url} className="overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.alt || post.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <figcaption className="border-t bg-background px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      {getImageCaption(asset.role, post)}
                    </figcaption>
                  </figure>
                ))}
              </section>
            )}

            {(post.metadata?.sourceQualityNote || post.canonicalUrl) && (
              <footer className="mt-12 border-t pt-8">
                {post.metadata?.sourceQualityNote && (
                  <div className="mb-5 rounded-lg border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Source and trust note
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {post.metadata.sourceQualityNote}
                    </p>
                  </div>
                )}
                {post.canonicalUrl && (
                  <p className="text-sm text-muted-foreground">
                    Reference:{" "}
                    <a
                      href={post.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {new URL(post.canonicalUrl).hostname}
                    </a>
                  </p>
                )}
              </footer>
            )}

            <section className="mt-12 border-t pt-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold">Keep Reading</h2>
                <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
                  All posts
                </Link>
              </div>

              {(previousPost || nextPost) && (
                <div className="mb-6 grid gap-3 md:grid-cols-2">
                  {previousPost && (
                    <Link
                      href={`/blog/${previousPost.slug}`}
                      className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Previous note
                      </div>
                      <div className="font-display text-lg font-bold leading-snug">
                        {previousPost.title}
                      </div>
                    </Link>
                  )}
                  {nextPost && (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className="rounded-lg border bg-card p-4 text-right transition-colors hover:border-primary/50"
                    >
                      <div className="mb-2 flex items-center justify-end gap-2 text-xs font-medium uppercase text-muted-foreground">
                        Next note
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div className="font-display text-lg font-bold leading-snug">
                        {nextPost.title}
                      </div>
                    </Link>
                  )}
                </div>
              )}

              {relatedPosts.length > 0 && (
                <div className="grid gap-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    Related by lane or topic
                  </p>
                  <div className="grid gap-4">
                    {relatedPosts.map((relatedPost) => (
                      <ArticleNewsCard key={relatedPost._id} post={relatedPost} variant="brief" />
                    ))}
                  </div>
                </div>
              )}

              {recentPosts.length > 0 && (
                <div className="mt-8 rounded-xl border bg-card/70 p-4 md:p-5">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Recent Articles
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-bold">
                        Latest published notes
                      </h2>
                    </div>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Browse all
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="divide-y divide-border">
                    {recentPosts.map((recentPost) => (
                      <Link
                        key={recentPost._id}
                        href={`/blog/${recentPost.slug}`}
                        className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {getArticleLane(recentPost)}
                          </div>
                          <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug transition-colors hover:text-primary">
                            {recentPost.title}
                          </h3>
                          {(recentPost.metadata?.readerHook ||
                            recentPost.metadata?.seoDescription ||
                            recentPost.metadata?.aiSummary) && (
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                              {recentPost.metadata.readerHook ||
                                recentPost.metadata.seoDescription ||
                                recentPost.metadata.aiSummary}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {recentPost.metadata?.readTime
                            ? `${recentPost.metadata.readTime} min read`
                            : formatDate(new Date(recentPost.createdAt).toISOString())}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </article>
        </main>
      </BlogPostTracker>
    </ConvexClientProvider>
  );
}
