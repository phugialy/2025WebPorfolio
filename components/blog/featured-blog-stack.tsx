"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlogPost } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";
import { trackPostClick, useBlogTracking } from "@/lib/blog-tracking";

interface FeaturedBlogStackProps {
  posts: BlogPost[];
}

export function FeaturedBlogStack({ posts }: FeaturedBlogStackProps) {
  const { track } = useBlogTracking();

  if (!posts || posts.length === 0) {
    return null;
  }

  const handleClick = (slug: string) => {
    trackPostClick(slug, track);
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Latest from the Blog</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Insights on automation, cloud infrastructure, and full-stack development
        </p>
      </div>

      <div className="space-y-5">
        {posts.slice(0, 3).map((post) => (
          <Link
            key={post._id}
            href={`/blog/${post.slug}`}
            onClick={() => handleClick(post.slug)}
            className="group block"
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50">
              <div className="p-6 flex flex-col justify-between h-full min-h-[160px]">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <time dateTime={new Date(post.createdAt).toISOString()}>
                      {formatDate(new Date(post.createdAt).toISOString())}
                    </time>
                    {post.metadata?.readTime && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.metadata.readTime} min</span>
                        </div>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-xl md:text-2xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {post.metadata?.aiSummary && (
                    <p className="text-muted-foreground text-base line-clamp-3 mb-3 leading-relaxed">
                      {post.metadata.aiSummary}
                    </p>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-primary/10 text-primary rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* View All Button at Bottom */}
      <div className="pt-4 border-t">
        <Link href="/blog">
          <Button variant="outline" size="lg" className="w-full group gap-2 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
            <span className="font-medium">View All Blog Posts</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

