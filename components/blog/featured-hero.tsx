"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlogPost } from "@/lib/articles";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";
import { trackPostClick, useBlogTracking } from "@/lib/blog-tracking";

interface FeaturedHeroProps {
  posts: BlogPost[];
}

export function FeaturedHero({ posts }: FeaturedHeroProps) {
  const { track } = useBlogTracking();

  if (!posts || posts.length === 0) {
    return null;
  }

  const heroPost = posts[0];
  const secondaryPosts = posts.slice(1, 3);

  const handleClick = (slug: string) => {
    trackPostClick(slug, track);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="mb-2 font-display text-2xl font-bold md:text-3xl">
            Latest from the Blog
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Practical notes on AI, automation, software, and local business workflows.
          </p>
        </div>
        <Link href="/blog">
          <Button variant="outline" size="sm" className="gap-2">
            View All Posts
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Link
          href={`/blog/${heroPost.slug}`}
          onClick={() => handleClick(heroPost.slug)}
          className="group lg:col-span-2"
        >
          <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            {heroPost.metadata?.heroImageUrl && (
              <div className="overflow-hidden border-b bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPost.metadata.heroImageUrl}
                  alt={
                    heroPost.metadata.imageAssets?.[0]?.alt ||
                    heroPost.metadata.imagePrompts?.[0]?.alt ||
                    heroPost.title
                  }
                  className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] md:h-56 lg:h-60"
                />
              </div>
            )}

            <div className="flex min-h-[180px] flex-col justify-between p-5 lg:p-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <time dateTime={new Date(heroPost.createdAt).toISOString()}>
                    {formatDate(new Date(heroPost.createdAt).toISOString())}
                  </time>
                  {heroPost.metadata?.readTime && (
                    <>
                      <span aria-hidden="true">/</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {heroPost.metadata.readTime} min read
                      </span>
                    </>
                  )}
                </div>

                <h3 className="mb-3 font-display text-2xl font-bold transition-colors group-hover:text-primary md:text-3xl">
                  {heroPost.title}
                </h3>

                {heroPost.metadata?.aiSummary && (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {heroPost.metadata.aiSummary}
                  </p>
                )}

                {heroPost.tags && heroPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {heroPost.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center text-primary group-hover:underline">
                <span className="font-medium">Read more</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Card>
        </Link>

        <div className="space-y-4">
          {secondaryPosts.map((post) => (
            <Link
              key={post._id}
              href={`/blog/${post.slug}`}
              onClick={() => handleClick(post.slug)}
              className="group block"
            >
              <Card className="h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                <div className="flex h-full min-h-[140px] flex-col justify-between p-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={new Date(post.createdAt).toISOString()}>
                        {formatDate(new Date(post.createdAt).toISOString())}
                      </time>
                      {post.metadata?.readTime && (
                        <>
                          <span aria-hidden="true">/</span>
                          <Clock className="h-3 w-3" />
                          <span>{post.metadata.readTime} min</span>
                        </>
                      )}
                    </div>

                    <h4 className="mb-2 line-clamp-2 font-display text-lg font-bold transition-colors group-hover:text-primary md:text-xl">
                      {post.title}
                    </h4>

                    {post.metadata?.aiSummary && (
                      <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                        {post.metadata.aiSummary}
                      </p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
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
