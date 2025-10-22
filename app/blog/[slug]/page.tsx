import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { getAllPosts, getPostBySlug, incrementPostViews } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";

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

  return {
    title: post.title,
    description: post.metadata?.aiSummary || post.notes,
    openGraph: {
      title: post.title,
      description: post.metadata?.aiSummary || post.notes,
      type: "article",
      publishedTime: new Date(post.createdAt).toISOString(),
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

  // Increment view count (fire and forget)
  try {
    await incrementPostViews(slug);
  } catch (error) {
    console.error("Error incrementing views:", error);
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <time dateTime={new Date(post.createdAt).toISOString()}>
                {formatDate(new Date(post.createdAt).toISOString())}
              </time>
              {post.author && (
                <>
                  <span>•</span>
                  <span>{post.author}</span>
                </>
              )}
              {post.metadata?.readTime && (
                <>
                  <span>•</span>
                  <span>{post.metadata.readTime} min read</span>
                </>
              )}
              {post.metadata?.views && (
                <>
                  <span>•</span>
                  <span>{post.metadata.views} views</span>
                </>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {post.title}
            </h1>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {post.metadata?.aiSummary && (
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <p className="text-muted-foreground italic">{post.metadata.aiSummary}</p>
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            <MDXRemote 
              source={post.content} 
              components={{
                // Handle missing components gracefully
                SourceCard: ({ children }: { children?: React.ReactNode }) => (
                  <div className="bg-muted p-4 rounded-lg">{children}</div>
                ),
                TagList: ({ tags }: { tags?: string[] }) => (
                  <div className="flex flex-wrap gap-2 my-4">
                    {(tags || []).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ),
              }}
            />
          </div>

          <footer className="mt-12 pt-8 border-t">
            <div className="flex flex-col gap-4">
              {post.canonicalUrl && (
                <p className="text-sm text-muted-foreground">
                  Originally published at{" "}
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Source: {post.source}</span>
                {post.quality && (
                  <span>• Quality Score: {post.quality}/100</span>
                )}
                {post.notes && (
                  <span>• Notes: {post.notes}</span>
                )}
              </div>
            </div>
          </footer>
        </article>
      </main>
    </>
  );
}

