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
import { getArticleLane } from "@/components/blog/article-news-card";

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

type ArticlePost = NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>;
type ArticleList = Awaited<ReturnType<typeof getAllPosts>>;

function getPostImage(post: ArticlePost | ArticleList[number]) {
  return post.metadata?.heroImageUrl || post.metadata?.imageAssets?.[0]?.url;
}

function getPostTeaser(post: ArticlePost | ArticleList[number]) {
  return (
    post.metadata?.readerHook ||
    post.metadata?.readerPayoff ||
    post.metadata?.seoDescription ||
    post.metadata?.aiSummary ||
    post.notes ||
    "A practical note on software, automation, and the decisions behind better systems."
  );
}

function getPostDate(post: ArticlePost | ArticleList[number]) {
  return formatDate(new Date(post.publishDate || post.createdAt).toISOString());
}

function KeepReadingPanel({
  relatedPosts,
  recentPosts,
  previousPost,
  nextPost,
}: {
  relatedPosts: ArticleList;
  recentPosts: ArticleList;
  previousPost?: ArticleList[number];
  nextPost?: ArticleList[number];
}) {
  const featuredPost = relatedPosts[0] || nextPost || previousPost || recentPosts[0];

  if (!featuredPost) return null;

  const seen = new Set([featuredPost.slug]);
  const secondaryPosts = relatedPosts
    .filter((post) => {
      if (seen.has(post.slug)) return false;
      seen.add(post.slug);
      return true;
    })
    .slice(0, 2);
  const latestPosts = recentPosts
    .filter((post) => {
      if (seen.has(post.slug)) return false;
      seen.add(post.slug);
      return true;
    })
    .slice(0, 5);
  const articlePath = [previousPost, nextPost].filter(
    (post): post is ArticleList[number] => Boolean(post)
  );
  const featuredImage = getPostImage(featuredPost);

  return (
    <section
      className="relative left-1/2 mt-14 w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 border-t pt-8"
      aria-labelledby="keep-reading-heading"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Keep reading
          </p>
          <h2 id="keep-reading-heading" className="mt-2 font-display text-2xl font-bold">
            Follow the thread
          </h2>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Browse all notes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card/60">
        <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div className="p-4 sm:p-5">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]"
            >
              <div className="overflow-hidden rounded-lg bg-muted">
                {featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredImage}
                    alt={featuredPost.title}
                    className="aspect-[16/10] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-primary/10 text-sm font-medium text-primary">
                    {getArticleLane(featuredPost)}
                  </div>
                )}
              </div>

              <div className="min-w-0 self-center">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary">
                    Recommended next
                  </span>
                  <span>{getArticleLane(featuredPost)}</span>
                  <span aria-hidden="true">/</span>
                  <span>{getPostDate(featuredPost)}</span>
                </div>
                <h3 className="font-display text-2xl font-bold leading-tight transition-colors group-hover:text-primary">
                  {featuredPost.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {getPostTeaser(featuredPost)}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Read this note
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            {secondaryPosts.length > 0 && (
              <div className="mt-6 border-t pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Same lane, different angle
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {secondaryPosts.map((post) => (
                    <Link
                      key={post._id}
                      href={`/blog/${post.slug}`}
                      className="group min-w-0 rounded-lg bg-muted/25 p-4 transition-colors hover:bg-muted/45"
                    >
                      <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
                        {getArticleLane(post)}
                      </div>
                      <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
                        {post.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {getPostTeaser(post)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {articlePath.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
                {previousPost && (
                  <Link
                    href={`/blog/${previousPost.slug}`}
                    className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="truncate">Previous: {previousPost.title}</span>
                  </Link>
                )}
                {nextPost && (
                  <Link
                    href={`/blog/${nextPost.slug}`}
                    className="inline-flex min-w-0 flex-1 items-center justify-end gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <span className="truncate">Next: {nextPost.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {latestPosts.length > 0 && (
            <aside className="border-t bg-muted/10 p-4 sm:p-5 md:border-l md:border-t-0">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Latest notes
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Fresh posts without pulling you out of the reading flow.
                </p>
              </div>
              <div className="space-y-1">
                {latestPosts.map((post) => (
                  <Link
                    key={post._id}
                    href={`/blog/${post.slug}`}
                    className="group block rounded-lg px-3 py-3 transition-colors hover:bg-background/70"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="truncate">{getArticleLane(post)}</span>
                      <span className="shrink-0">{getPostDate(post)}</span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
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
  const socialImage = post.metadata?.heroImageUrl || "/brand/phugialy-social-card.png";

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
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [socialImage],
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

            <KeepReadingPanel
              relatedPosts={relatedPosts}
              recentPosts={recentPosts}
              previousPost={previousPost}
              nextPost={nextPost}
            />
          </article>
        </main>
      </BlogPostTracker>
    </ConvexClientProvider>
  );
}
