"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlogPost } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Clock, Eye } from "lucide-react";
import { trackPostClick, useBlogTracking } from "@/lib/blog-tracking";

interface FeaturedHeroProps {
  posts: BlogPost[];
}

export function FeaturedHero({ posts }: FeaturedHeroProps) {
  const { track } = useBlogTracking();

  if (!posts || posts.length === 0) {
    return null;
  }

  // Take the first post as the main hero, next 2 as secondary
  const heroPost = posts[0];
  const secondaryPosts = posts.slice(1, 3);

  const handleClick = (slug: string) => {
    trackPostClick(slug, track);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Latest from the Blog</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Insights on automation, cloud infrastructure, and full-stack development
          </p>
        </div>
        <Link href="/blog">
          <Button variant="outline" size="sm" className="gap-2">
            View All Posts
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Hero Post - Takes 2 columns on large screens */}
        {heroPost && (
          <Link
            href={`/blog/${heroPost.slug}`}
            onClick={() => handleClick(heroPost.slug)}
            className="lg:col-span-2 group"
          >
            <Card className="h-full hover:shadow-xl transition-all duration-300 hover:border-primary/50 overflow-hidden">
              <div className="p-6 lg:p-8 flex flex-col justify-between h-full min-h-[300px]">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <time dateTime={new Date(heroPost.createdAt).toISOString()}>
                      {formatDate(new Date(heroPost.createdAt).toISOString())}
                    </time>
                    {heroPost.metadata?.readTime && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{heroPost.metadata.readTime} min read</span>
                        </div>
                      </>
                    )}
                    {heroPost.metadata?.views !== undefined && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{heroPost.metadata.views} views</span>
                        </div>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {heroPost.title}
                  </h3>

                  {heroPost.metadata?.aiSummary && (
                    <p className="text-muted-foreground text-lg mb-4 line-clamp-2">
                      {heroPost.metadata.aiSummary}
                    </p>
                  )}

                  {heroPost.tags && heroPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {heroPost.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center text-primary group-hover:underline mt-4">
                  <span className="font-medium">Read more</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </Link>
        )}

        {/* Secondary Posts - Take 1 column on large screens */}
        <div className="space-y-4">
          {secondaryPosts.map((post) => (
            <Link
              key={post._id}
              href={`/blog/${post.slug}`}
              onClick={() => handleClick(post.slug)}
              className="group block"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <div className="p-4 flex flex-col justify-between h-full min-h-[140px]">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <time dateTime={new Date(post.createdAt).toISOString()}>
                        {formatDate(new Date(post.createdAt).toISOString())}
                      </time>
                      {post.metadata?.readTime && (
                        <>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{post.metadata.readTime} min</span>
                        </>
                      )}
                    </div>

                    <h4 className="font-display text-lg md:text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h4>

                    {post.metadata?.aiSummary && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                        {post.metadata.aiSummary}
                      </p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
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
      </div>
    </div>
  );
}

