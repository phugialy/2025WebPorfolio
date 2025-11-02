"use client";

import { BlogPost } from "@/lib/convex-posts";
import { BlogCard } from "./blog-card";

interface FeaturedPostsProps {
  posts: BlogPost[];
  limit?: number;
}

export function FeaturedPosts({ posts, limit = 3 }: FeaturedPostsProps) {
  // Get most recent posts as "featured" (you can enhance this with actual featured flag or popular posts)
  const featured = posts.slice(0, limit);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          Featured Posts
        </h2>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Latest updates
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((post) => (
          <BlogCard key={post._id} post={post} viewMode="grid" featured />
        ))}
      </div>
    </section>
  );
}

