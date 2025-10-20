import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllPosts } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Blog",
  description: "Thoughts on web development, software engineering, and technology.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

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
                <article key={post._id} className="group">
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <time dateTime={new Date(post.createdAt).toISOString()}>
                            {formatDate(new Date(post.createdAt).toISOString())}
                          </time>
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex gap-2">
                                {post.tags.slice(0, 3).map((tag) => (
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
                          {post.title}
                        </CardTitle>
                        {post.metadata?.aiSummary && (
                          <CardDescription className="text-base">
                            {post.metadata.aiSummary}
                          </CardDescription>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>Source: {post.source}</span>
                          {post.metadata?.readTime && (
                            <span>• {post.metadata.readTime} min read</span>
                          )}
                          {post.metadata?.views && (
                            <span>• {post.metadata.views} views</span>
                          )}
                        </div>
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

