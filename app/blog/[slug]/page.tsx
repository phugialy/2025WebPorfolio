import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";

export async function generateStaticParams() {
  const posts = getAllPosts();
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
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.summary,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.summary,
      type: "article",
      publishedTime: post.frontmatter.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <time dateTime={post.frontmatter.date}>
                {formatDate(post.frontmatter.date)}
              </time>
              {post.frontmatter.author && (
                <>
                  <span>•</span>
                  <span>{post.frontmatter.author}</span>
                </>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {post.frontmatter.title}
            </h1>
            {post.frontmatter.tags && (
              <div className="flex gap-2">
                {post.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            <MDXRemote source={post.content} />
          </div>

          {post.frontmatter.canonical_link && (
            <footer className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                Originally published at{" "}
                <a
                  href={post.frontmatter.canonical_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {new URL(post.frontmatter.canonical_link).hostname}
                </a>
              </p>
            </footer>
          )}
        </article>
      </main>
    </>
  );
}

