"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";
import { ResourceFeedCard } from "@/components/affiliate/resource-feed-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogRows } from "@/components/blog/blog-rows";
import { FilterDrawer } from "@/components/blog/filter-drawer";
import { SponsorBanner, type SponsorSlide } from "@/components/sponsors/sponsor-banner";
import { isAmbitProduct } from "@/lib/ambit-brand";
import { BlogPost } from "@/lib/articles";
import { THEMES, buildBlogRows, inTheme } from "@/lib/blog-rows";
import type { AffiliateProduct } from "@/lib/affiliate";
import { LANES } from "@/lib/lanes";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const filtersButton = useRef<HTMLButtonElement>(null);

  // Closing the drawer hands focus back to the button that opened it.
  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    filtersButton.current?.focus();
  }, []);

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

  // Every tag, most used first, so the drawer can lead with the ones readers are most likely to want.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) for (const tag of post.tags || []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [posts]);

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
  // The strip rotates through Ambit first, then every other marked partner
  // (ElevenLabs today), so a new partner is one more slide, not a new banner.
  const sponsorSlides = useMemo<SponsorSlide[]>(
    () => [
      ...(ambit ? [{ kind: "ambit" as const, product: ambit, refId: "blog-index-ambit" }] : []),
      ...resources
        .filter((resource) => resource.is_partner && !isAmbitProduct(resource))
        .map((partner) => ({ kind: "partner" as const, product: partner, refId: "blog-index-partner" })),
    ],
    [ambit, resources]
  );

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

  // What is filtering the page, shown as removable pills so the rows going away is never a mystery.
  const activePills = [
    selectedTheme && { key: "theme", label: THEMES.find((t) => t.id === selectedTheme)?.title ?? selectedTheme, remove: () => setSelectedTheme(null) },
    selectedLane && { key: "lane", label: lanes.find((l) => l.value === selectedLane)?.label ?? selectedLane, remove: () => setSelectedLane(null) },
    selectedTag && { key: "tag", label: selectedTag, remove: () => setSelectedTag(null) },
  ].filter((pill): pill is { key: string; label: string; remove: () => void } => Boolean(pill));
  const activeFilterCount = activePills.length;

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
                <CardDescription>Loading stories...</CardDescription>
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
                  <CardTitle>No stories yet</CardTitle>
                  <CardDescription>Check back soon for new content.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              !hasActiveDiscovery && leadPost && (
                <section aria-label="Latest story" className="border-y border-border py-8">
                  <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Latest story / {getArticleLane(leadPost)}</p>
                  <ArticleNewsCard post={leadPost} variant="lead" />
                </section>
              )
            )}

            <div className="mt-12">
            {sponsorSlides.length > 0 && (
              // Each slide logs its own impression once it is showing and on
              // screen, under the same label as its click link.
              <SponsorBanner slides={sponsorSlides} className="mb-10" />
            )}
            {/* One slim bar stays on screen while you scroll: search, and a button that opens the filters in a side panel. */}
              <div className="sticky top-[5.1rem] z-30 -mx-5 mb-8 border-y border-border bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="relative min-w-0 flex-1 lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by topic, tool, workflow, or source..."
                      aria-label="Search stories"
                      className="border-white/15 bg-transparent pl-10"
                    />
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {hasActiveDiscovery && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
                        <X className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                    <button
                      ref={filtersButton}
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen(true)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span aria-label={`${activeFilterCount} active`} className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                {activePills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Active filters" role="group">
                    {activePills.map((pill) => (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={pill.remove}
                        aria-label={`Remove filter ${pill.label}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {pill.label}
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ))}
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
                <h2 className="mt-3 font-display text-4xl font-semibold">{hasActiveDiscovery ? "Matching stories" : "All stories"}</h2>
              </div>
              <span className="text-sm text-muted-foreground" role="status">
                {archivePosts.length} {archivePosts.length === 1 ? "story" : "stories"} {hasActiveDiscovery ? "matching" : "in the archive"}
              </span>
            </div>

            {archivePosts.length === 0 ? (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>No stories found</CardTitle>
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
        <FilterDrawer
          open={filtersOpen}
          onClose={closeFilters}
          themes={THEMES.map((theme) => ({ value: theme.id, label: theme.title }))}
          selectedTheme={selectedTheme}
          onTheme={setSelectedTheme}
          lanes={lanes}
          selectedLane={selectedLane}
          onLane={setSelectedLane}
          tags={tagCounts}
          selectedTag={selectedTag}
          onTag={setSelectedTag}
          resultCount={archivePosts.length}
          hasActive={activeFilterCount > 0}
          onClear={clearFilters}
        />
      </main>
    </>
  );
}

export default function BlogPage() {
  return (
      <BlogContent />
  );
}
