"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";
import { ResourceFeedCard } from "@/components/affiliate/resource-feed-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogRows } from "@/components/blog/blog-rows";
import { AmbitSaveCallout } from "@/components/ambit/ambit-save-callout";
import { ImpressionPing } from "@/components/ambit/impression-ping";
import { isAmbitProduct } from "@/lib/ambit-brand";
import { BlogPost } from "@/lib/articles";
import { THEMES, buildBlogRows, inTheme } from "@/lib/blog-rows";
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
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);
  const results = useRef<HTMLDivElement>(null);

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
      const matchesTheme = selectedTheme ? inTheme(post, selectedTheme) : true;
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

      return matchesLane && matchesTag && matchesTheme && matchesSearch;
    });
  }, [posts, searchQuery, selectedLane, selectedTag, selectedTheme]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLane, selectedTag, selectedTheme]);

  // /api/resources returns every active product, partners included. Ambit
  // gets its own banner (with required disclosures) and must never be
  // interleaved into the feed as a generic resource card.
  const ambit = resources.find(isAmbitProduct) ?? null;
  const feedResources = resources.filter((resource) => !isAmbitProduct(resource));

  const leadPost = posts[0];
  const hasActiveDiscovery = Boolean(searchQuery || selectedLane || selectedTag || selectedTheme);
  // The rows are the front page. They give way to a plain list of matches as
  // soon as a reader searches or filters, where every relevant result belongs.
  // Order, windows and rotation live in lib/blog-rows.ts (ROW_PLAN).
  const rows = useMemo(
    () => (leadPost ? buildBlogRows(posts, { excludeIds: [leadPost._id] }) : []),
    [posts, leadPost]
  );
  const archivePosts = hasActiveDiscovery ? filteredPosts : filteredPosts.slice(1);
  const totalPages = Math.ceil(archivePosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return archivePosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [archivePosts, currentPage]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLane(null);
    setSelectedTag(null);
    setSelectedTheme(null);
  };

  const showTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    requestAnimationFrame(() => results.current?.scrollIntoView({ block: "start" }));
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
      <main className="min-h-screen overflow-x-clip bg-background text-foreground">
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
              !hasActiveDiscovery && leadPost && (
                <section aria-label="Latest note" className="border-y border-border py-8">
                  <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Latest note / {getArticleLane(leadPost)}</p>
                  <ArticleNewsCard post={leadPost} variant="lead" />
                </section>
              )
            )}

            <div className="mt-12">
            {ambit && (
              // Impression is logged by ImpressionPing when the banner is
              // actually on screen, under the same label as the click ref.
              <div className="relative mb-10">
                <AmbitSaveCallout product={ambit} refId="blog-index-ambit" variant="banner" />
                <ImpressionPing productId={ambit.id} refId="blog-index-ambit" />
              </div>
            )}
            {/* Search and the theme chips stay on screen while you scroll the rows. */}
              <div className="sticky top-[5.1rem] z-30 -mx-5 border-y border-border bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by topic, tool, workflow, or source..."
                      aria-label="Search notes"
                      className="border-white/15 bg-transparent pl-10"
                    />
                  </div>
                  <div role="group" aria-label="Browse by theme" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={selectedTheme === theme.id}
                        onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedTheme === theme.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                        )}
                      >
                        {theme.title}
                      </button>
                    ))}
                    {hasActiveDiscovery && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
                        <X className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>

            <div className="mb-8">
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
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
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

            {!hasActiveDiscovery && rows.length > 0 && (
              <div className="mb-14" data-testid="blog-rows">
                <BlogRows rows={rows} onSeeAll={showTheme} />
              </div>
            )}

            <div ref={results} className="mb-5 flex scroll-mt-40 flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {hasActiveDiscovery ? "Search results" : "Archive"}
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold">{hasActiveDiscovery ? "Matching notes" : "All notes"}</h2>
              </div>
              <span className="text-sm text-muted-foreground" role="status">
                {archivePosts.length} {archivePosts.length === 1 ? "paper" : "papers"} {hasActiveDiscovery ? "matching" : "in the archive"}
              </span>
            </div>

            {archivePosts.length === 0 ? (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>No papers found</CardTitle>
                  <CardDescription>Try a different theme, lane, tag, or search term.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="grid gap-5">
                  {paginatedPosts.map((post, index) => {
                    const globalIndex = (currentPage - 1) * POSTS_PER_PAGE + index;
                    const showResource =
                      !searchQuery &&
                      feedResources.length > 0 &&
                      globalIndex > 0 &&
                      (globalIndex + 1) % RESOURCE_CARD_INTERVAL === 0;
                    const resource = showResource
                      ? feedResources[
                          Math.floor(globalIndex / RESOURCE_CARD_INTERVAL) % feedResources.length
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
                    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
