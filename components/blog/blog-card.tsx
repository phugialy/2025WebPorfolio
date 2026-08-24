"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogPost } from "@/lib/articles";
import { formatDate } from "@/lib/utils";
import { Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackPostClick, trackTagClick, useBlogTracking } from "@/lib/blog-tracking";

interface BlogCardProps {
  post: BlogPost;
  viewMode?: "grid" | "list";
  featured?: boolean;
}

export function BlogCard({ post, viewMode = "list", featured = false }: BlogCardProps) {
  const { track } = useBlogTracking();

  const handleClick = () => {
    trackPostClick(post.slug, track);
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    trackTagClick(post.slug, tag, track);
  };

  if (viewMode === "grid") {
    return (
      <article className="group h-full">
        <Link href={`/blog/${post.slug}`} onClick={handleClick}>
          <Card className="flex h-full flex-col transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            {post.metadata?.heroImageUrl && (
              <div className="overflow-hidden rounded-t-lg border-b bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.metadata.heroImageUrl}
                  alt={
                    post.metadata.imageAssets?.[0]?.alt ||
                    post.metadata.imagePrompts?.[0]?.alt ||
                    post.title
                  }
                  className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            )}
            <CardHeader className="flex-grow">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={new Date(post.createdAt).toISOString()}>
                  {formatDate(new Date(post.createdAt).toISOString())}
                </time>
                {post.metadata?.readTime && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.metadata.readTime} min
                    </span>
                  </>
                )}
              </div>

              <CardTitle className="mb-2 line-clamp-2 transition-colors group-hover:text-primary">
                {post.title}
              </CardTitle>

              {post.metadata?.aiSummary && (
                <CardDescription className="line-clamp-3 text-sm">
                  {post.metadata.aiSummary}
                </CardDescription>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => handleTagClick(e, tag)}
                      className="cursor-pointer rounded bg-primary/10 px-2 py-0.5 text-xs text-primary transition-colors hover:bg-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardHeader>
          </Card>
        </Link>
      </article>
    );
  }

  return (
    <article className="group">
      <Card className="transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
        <Link href={`/blog/${post.slug}`} onClick={handleClick}>
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <time dateTime={new Date(post.createdAt).toISOString()}>
                {formatDate(new Date(post.createdAt).toISOString())}
              </time>
              {post.metadata?.readTime && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.metadata.readTime} min read
                  </span>
                </>
              )}
            </div>

            <CardTitle
              className={cn(
                "mb-2 transition-colors group-hover:text-primary",
                featured && "text-2xl md:text-3xl"
              )}
            >
              {post.title}
            </CardTitle>

            {post.metadata?.aiSummary && (
              <CardDescription className={cn("text-base", featured && "text-lg")}>
                {post.metadata.aiSummary}
              </CardDescription>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    onClick={(e) => handleTagClick(e, tag)}
                    className={cn(
                      "cursor-pointer rounded px-2 py-1 text-xs transition-colors",
                      featured
                        ? "bg-primary/20 text-primary"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>
        </Link>

        {post.canonicalUrl && (
          <div className="flex flex-wrap items-center gap-4 px-6 pb-6 text-xs text-muted-foreground">
            <a
              href={post.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 transition-colors hover:text-primary"
            >
              <span>Reference</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </Card>
    </article>
  );
}
