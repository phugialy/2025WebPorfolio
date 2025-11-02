"use client";

import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogPost } from "@/lib/convex-posts";
import { BlogFilters } from "@/components/blog/blog-filters";
import { BlogCard } from "@/components/blog/blog-card";
import { FeaturedHero } from "@/components/blog/featured-hero";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { useBlogTracking, trackSearch, trackFilter } from "@/lib/blog-tracking";
import { getAllPosts } from "@/lib/convex-posts";

const POSTS_PER_PAGE = 6; // Optimized for 3-column grid (2x3 layout)

function BlogContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { track } = useBlogTracking();

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        const allPosts = await getAllPosts();
        setPosts(allPosts);
        setFilteredPosts(allPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleFilterChange = (filtered: BlogPost[]) => {
    setFilteredPosts(filtered);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      trackSearch("blog-list", query, track);
    }
  };

  const handleTagClick = (tag: string) => {
    trackFilter("blog-list", "tag", tag, track);
  };

  const handleViewToggle = (view: "grid" | "list") => {
    setViewMode(view);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of posts section
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Featured posts are always the first 3 from ALL posts (independent of filters)
  const featuredPosts = useMemo(() => posts.slice(0, 3), [posts]);
  // Regular posts are filtered posts excluding featured ones
  const regularPosts = useMemo(() => {
    const featuredIds = new Set(featuredPosts.map(p => p._id));
    return filteredPosts.filter(p => !featuredIds.has(p._id));
  }, [filteredPosts, featuredPosts]);

  // Paginate regular posts
  const totalPages = Math.ceil(regularPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return regularPosts.slice(startIndex, endIndex);
  }, [regularPosts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredPosts]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <header className="mb-12">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Blog</h1>
              <p className="text-xl text-muted-foreground">
                Thoughts on web development, software engineering, and technology.
              </p>
            </header>
            <Card>
              <CardHeader>
                <CardDescription>Loading posts...</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
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
            <>
              {/* Featured Hero Section - Show at top if we have 3+ posts */}
              {posts.length >= 3 && (
                <FeaturedHero posts={featuredPosts} />
              )}

              <BlogFilters
                posts={posts}
                onFilterChange={handleFilterChange}
                onSearch={handleSearch}
                onTagClick={handleTagClick}
                onViewToggle={handleViewToggle}
              />

              {filteredPosts.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No posts found</CardTitle>
                    <CardDescription>Try adjusting your filters or search query.</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  {/* All Posts Section */}
                  {regularPosts.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="font-display text-xl md:text-2xl font-bold">
                          All Posts
                        </h2>
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {regularPosts.length} {regularPosts.length === 1 ? "post" : "posts"}
                        </span>
                      </div>

                      {viewMode === "grid" ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {paginatedPosts.map((post) => (
                            <BlogCard key={post._id} post={post} viewMode="grid" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {paginatedPosts.map((post) => (
                            <BlogCard key={post._id} post={post} viewMode="list" />
                          ))}
                        </div>
                      )}

                      {/* Pagination */}
                      <BlogPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={regularPosts.length}
                        itemsPerPage={POSTS_PER_PAGE}
                      />
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function BlogPage() {
  return (
    <ConvexClientProvider>
      <BlogContent />
    </ConvexClientProvider>
  );
}

