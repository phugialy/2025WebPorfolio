"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";
import { ResourceFeedCard } from "@/components/affiliate/resource-feed-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogPost } from "@/lib/articles";
import type { AffiliateProduct } from "@/lib/affiliate";
import { LANES } from "@/lib/lanes";
import { cn } from "@/lib/utils";

const POSTS_PER_PAGE = 8;

// Filter chips show LANES' friendlier display label but filter by the
// underlying value -- inferPortfolioLane/getArticleLane and /topics/[lane]
// routing all key off value, never label, so this stays a pure display
// substitution with no effect on filtering or URLs.
const lanes = LANES.map((lane) => ({ value: lane.value, label: lane.label }));

// One resource card per page at most, never more often than every 5 articles
// — see PHASE_ROADMAP.md's Phase 3 placement rule.
const RESOURCE_CARD_INTERVAL = 5;

function BlogContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [resources, setResources] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        const response = await fetch("/api/articles", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch articles");
        const allPosts = (await response.json()) as BlogPost[];
        setPosts(allPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    async function loadResources() {
      try {
        const response = await fetch("/api/resources", { cache: "no-store" });
        if (!response.ok) return;
        setResources((await response.json()) as AffiliateProduct[]);
      } catch (error) {
        console.error("Error fetching resources:", error);
      }
    }

    loadPosts();
    loadResources();
  }, []);

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => post.tags || []))).sort().slice(0, 14),
    [posts]
  );
  const visibleTags = showAllTags ? allTags : allTags.slice(0, 5);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return posts.filter((post) => {
      const lane = getArticleLane(post);
      const matchesLane = selectedLane ? lane === selectedLane : true;
      const matchesTag = selectedTag ? post.tags?.includes(selectedTag) : true;
      const matchesSearch = query
        ? [
            post.title,
            post.metadata?.aiSummary || "",
            post.metadata?.readerHook || "",
            post.metadata?.readerTakeaway || "",
            post.metadata?.readerProblem || "",
            post.metadata?.mainAngle || "",
            post.metadata?.intendedAudience || "",
            post.metadata?.publicAgentSummary || "",
            post.content || "",
            ...(post.tags || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;

      return matchesLane && matchesTag && matchesSearch;
    });
  }, [posts, searchQuery, selectedLane, selectedTag]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLane, selectedTag]);

  const leadPost = posts[0];
  const briefingPosts = posts.slice(1, 4);
  const hasActiveDiscovery = Boolean(searchQuery || selectedLane || selectedTag);
  // The opening spread is the front page. Keep it out of the archive until a
  // reader actively searches or filters, where every relevant result belongs.
  const archivePosts = hasActiveDiscovery ? filteredPosts : filteredPosts.slice(4);
  const totalPages = Math.ceil(archivePosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return archivePosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [archivePosts, currentPage]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLane(null);
    setSelectedTag(null);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen overflow-hidden bg-background text-foreground">
          <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardDescription>Loading papers...</CardDescription>
              </CardHeader>
            </Card>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
            <h1 className="sr-only">Practical AI and Automation Notes</h1>
            {posts.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No papers yet</CardTitle>
                  <CardDescription>Check back soon for new content.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              !hasActiveDiscovery && <section className="border-y border-border py-5 xl:py-0">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1.16fr)_minmax(400px,0.84fr)]">
                  <div className="xl:border-r xl:border-border xl:py-10 xl:pr-6">
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Latest note / {leadPost && getArticleLane(leadPost)}</p>
                    {leadPost && <ArticleNewsCard post={leadPost} variant="lead" />}
                  </div>
                  <aside className="border-t border-border pt-8 xl:border-t-0 xl:py-10 xl:pl-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Reading map</p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">Follow what is unfolding.</h2>
                      </div>
                      <span className="text-sm text-muted-foreground">{posts.length} notes</span>
                    </div>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Three connected places to keep reading from today&apos;s front page.</p>
                    <div className="mt-7 border-y border-border">
                      {briefingPosts.map((post, index) => (
                        <div key={post._id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border last:border-b-0">
                          <span className="pt-5 font-mono text-xs text-primary">0{index + 2}</span>
                          <ArticleNewsCard post={post} variant="brief" />
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </section>
            )}

            <div className="mt-12">
            <div className="mb-10 border-y border-border py-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by topic, tool, workflow, or source..."
                    className="border-white/15 bg-transparent pl-10"
                  />
                </div>
                {(searchQuery || selectedLane || selectedTag) && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {lanes.map((lane) => (
                  <button
                    key={lane.value}
                    onClick={() => setSelectedLane(selectedLane === lane.value ? null : lane.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedLane === lane.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {lane.label}
                  </button>
                ))}
              </div>

              {allTags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Tags
                  </span>
                  {visibleTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn(
                        "border px-3 py-1 text-sm transition-colors",
                        selectedTag === tag
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                  {allTags.length > 5 && (
                    <button onClick={() => setShowAllTags((current) => !current)} className="border border-border px-3 py-1 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                      {showAllTags ? "Show fewer" : `More topics (${allTags.length - 5})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Paper Feed
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold">{hasActiveDiscovery ? "Matching notes" : "Continue exploring"}</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {archivePosts.length} {archivePosts.length === 1 ? "paper" : "papers"} {hasActiveDiscovery ? "matching" : "in the archive"}
              </span>
            </div>

            {archivePosts.length === 0 ? (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>No papers found</CardTitle>
                  <CardDescription>Try a different lane, tag, or search term.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="grid gap-5">
                  {paginatedPosts.map((post, index) => {
                    const globalIndex = (currentPage - 1) * POSTS_PER_PAGE + index;
                    const showResource =
                      !searchQuery &&
                      resources.length > 0 &&
                      globalIndex > 0 &&
                      (globalIndex + 1) % RESOURCE_CARD_INTERVAL === 0;
                    const resource = showResource
                      ? resources[
                          Math.floor(globalIndex / RESOURCE_CARD_INTERVAL) % resources.length
                        ]
                      : null;

                    return (
                      <Fragment key={post._id}>
                        <ArticleNewsCard post={post} variant="feed" />
                        {resource && <ResourceFeedCard resource={resource} />}
                      </Fragment>
                    );
                  })}
                </div>

                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  totalItems={archivePosts.length}
                  itemsPerPage={POSTS_PER_PAGE}
                />
              </>
            )}
            </div>
          </div>
      </main>
    </>
  );
}

export default function BlogPage() {
  return (
      <BlogContent />
  );
}
