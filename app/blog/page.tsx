"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArticleNewsCard, getArticleLane } from "@/components/blog/article-news-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { BlogPost } from "@/lib/articles";
import { cn } from "@/lib/utils";

const POSTS_PER_PAGE = 8;

const lanes = [
  "AI Advancement",
  "Applied AI",
  "How-to-AI",
  "Vibe-coding / Codex",
  "DFW Commercial Projects + Sales",
];

function BlogContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

    loadPosts();
  }, []);

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => post.tags || []))).sort().slice(0, 14),
    [posts]
  );

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
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLane(null);
    setSelectedTag(null);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background text-foreground">
          <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <Card>
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
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b bg-[linear-gradient(180deg,rgba(59,130,246,0.10),transparent_58%)]">
          <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                    Practical AI & Automation Notes
                  </p>
                  <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
                    Field notes on AI tools, automation systems, and software workflows.
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    A technical publication desk for what I am reading, testing, and turning into practical software or business workflows.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-card/70 p-4 backdrop-blur">
                  <div>
                    <div className="font-display text-3xl font-bold">{posts.length}</div>
                    <div className="text-xs text-muted-foreground">published</div>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-bold">{lanes.length}</div>
                    <div className="text-xs text-muted-foreground">lanes</div>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-bold">
                      {posts.filter((post) => post.metadata?.heroImageUrl).length}
                    </div>
                    <div className="text-xs text-muted-foreground">with art</div>
                  </div>
                </div>
              </div>

              {posts.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No papers yet</CardTitle>
                    <CardDescription>Check back soon for new content.</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                  {leadPost && <ArticleNewsCard post={leadPost} variant="lead" />}
                  <div className="grid gap-4">
                    <div className="rounded-2xl border bg-card p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-xl font-bold">Latest Briefings</h2>
                          <p className="text-sm text-muted-foreground">Fast reads from the newest papers.</p>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {briefingPosts.map((post) => (
                          <ArticleNewsCard key={post._id} post={post} variant="brief" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 rounded-2xl border bg-card p-4 md:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by topic, tool, workflow, or source..."
                    className="pl-10"
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
                    key={lane}
                    onClick={() => setSelectedLane(selectedLane === lane ? null : lane)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedLane === lane
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {lane}
                  </button>
                ))}
              </div>

              {allTags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Tags
                  </span>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn(
                        "rounded-full px-3 py-1 text-sm transition-colors",
                        selectedTag === tag
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Paper Feed
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">All Published Papers</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredPosts.length} {filteredPosts.length === 1 ? "paper" : "papers"} visible
              </span>
            </div>

            {filteredPosts.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No papers found</CardTitle>
                  <CardDescription>Try a different lane, tag, or search term.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="grid gap-5">
                  {paginatedPosts.map((post) => (
                    <ArticleNewsCard key={post._id} post={post} variant="feed" />
                  ))}
                </div>

                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  totalItems={filteredPosts.length}
                  itemsPerPage={POSTS_PER_PAGE}
                />
              </>
            )}
          </div>
        </section>
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
