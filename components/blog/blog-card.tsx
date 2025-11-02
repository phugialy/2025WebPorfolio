"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogPost } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";
import { Clock, Eye, ExternalLink } from "lucide-react";
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
          <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 flex flex-col">
            <CardHeader className="flex-grow">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                <time dateTime={new Date(post.createdAt).toISOString()}>
                  {formatDate(new Date(post.createdAt).toISOString())}
                </time>
                {post.metadata?.readTime && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.metadata.readTime} min</span>
                    </div>
                  </>
                )}
                {post.metadata?.views !== undefined && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{post.metadata.views}</span>
                    </div>
                  </>
                )}
              </div>

              <CardTitle className="group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {post.title}
              </CardTitle>

              {post.metadata?.aiSummary && (
                <CardDescription className="line-clamp-3 text-sm">
                  {post.metadata.aiSummary}
                </CardDescription>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => handleTagClick(e, tag)}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-2 py-0.5 text-muted-foreground text-xs">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>{post.source}</span>
                {post.canonicalUrl && (
                  <ExternalLink className="w-3 h-3" />
                )}
              </div>
            </CardHeader>
          </Card>
        </Link>
      </article>
    );
  }

  // List view (default)
  return (
    <article className="group">
      <Card className="hover:shadow-lg transition-all duration-300 hover:border-primary/50">
        <Link href={`/blog/${post.slug}`} onClick={handleClick}>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
              <time dateTime={new Date(post.createdAt).toISOString()}>
                {formatDate(new Date(post.createdAt).toISOString())}
              </time>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex gap-2 flex-wrap">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        onClick={(e) => handleTagClick(e, tag)}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-colors cursor-pointer",
                          featured
                            ? "bg-primary/20 text-primary"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 4 && (
                      <span className="px-2 py-1 text-muted-foreground text-xs">
                        +{post.tags.length - 4} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <CardTitle className={cn(
              "group-hover:text-primary transition-colors mb-2",
              featured && "text-2xl md:text-3xl"
            )}>
              {post.title}
            </CardTitle>

            {post.metadata?.aiSummary && (
              <CardDescription className={cn(
                "text-base",
                featured && "text-lg"
              )}>
                {post.metadata.aiSummary}
              </CardDescription>
            )}
          </CardHeader>
        </Link>
        
        <div className="px-6 pb-6 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Source: {post.source}</span>
          {post.metadata?.readTime && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{post.metadata.readTime} min read</span>
              </span>
            </>
          )}
          {post.metadata?.views !== undefined && (
            <>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{post.metadata.views} views</span>
              </span>
            </>
          )}
          {post.canonicalUrl && (
            <a
              href={post.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <span>Original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </Card>
    </article>
  );
}

