import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Blog",
  description: "Thoughts on web development, software engineering, and technology.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Blog</h1>
            <p className="text-xl text-muted-foreground">
              Thoughts on web development, software engineering, and technology.
            </p>
          </header>

          {posts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No posts yet</CardTitle>
                <CardDescription>Check back soon for new content!</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article key={post.slug} className="group">
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <time dateTime={post.frontmatter.date}>
                            {formatDate(post.frontmatter.date)}
                          </time>
                          {post.frontmatter.tags && (
                            <>
                              <span>•</span>
                              <div className="flex gap-2">
                                {post.frontmatter.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {post.frontmatter.title}
                        </CardTitle>
                        {post.frontmatter.summary && (
                          <CardDescription className="text-base">
                            {post.frontmatter.summary}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

