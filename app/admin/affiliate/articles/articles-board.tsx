"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import type { ArticleAffiliateMatch, ArticleLite } from "@/lib/affiliate";

const PAGE_SIZE = 15;

type CoverageFilter = "all" | "none" | "needs-review" | "live";

type ArticleRow = {
  article: ArticleLite;
  liveCount: number;
  pendingCount: number;
};

export function ArticlesBoard() {
  const [articles, setArticles] = useState<ArticleLite[]>([]);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CoverageFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [articlesRes, matchesRes] = await Promise.all([
        fetch("/api/admin/affiliate/articles-lite").then((r) => r.json()),
        fetch("/api/admin/affiliate/placements?status=all").then((r) => r.json()),
      ]);
      setArticles(articlesRes.articles || []);
      setMatches(matchesRes.matches || []);
      setLoading(false);
    };
    load();
  }, []);

  const rows = useMemo<ArticleRow[]>(() => {
    const countsByArticle = new Map<string, { live: number; pending: number }>();
    for (const match of matches) {
      const entry = countsByArticle.get(match.article_id) || { live: 0, pending: 0 };
      if (match.approved && match.is_active) entry.live += 1;
      else if (!match.approved) entry.pending += 1;
      countsByArticle.set(match.article_id, entry);
    }

    return articles.map((article) => {
      const counts = countsByArticle.get(article.id) || { live: 0, pending: 0 };
      return { article, liveCount: counts.live, pendingCount: counts.pending };
    });
  }, [articles, matches]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (query && !row.article.title.toLowerCase().includes(query)) return false;
      if (filter === "none" && (row.liveCount > 0 || row.pendingCount > 0)) return false;
      if (filter === "needs-review" && row.pendingCount === 0) return false;
      if (filter === "live" && row.liveCount === 0) return false;
      return true;
    });
  }, [rows, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Coverage across every published article. Manage an individual pairing under Placements.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="articles" />
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by article title"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="sm:max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                {(["all", "none", "needs-review", "live"] as const).map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={filter === option ? "default" : "outline"}
                    onClick={() => {
                      setFilter(option);
                      setPage(1);
                    }}
                  >
                    {option === "all"
                      ? "All"
                      : option === "none"
                        ? "No placements yet"
                        : option === "needs-review"
                          ? "Needs review"
                          : "Live"}
                  </Button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No articles match</CardTitle>
                  <CardDescription>Try a different search or filter.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="grid gap-2">
                  {pageItems.map(({ article, liveCount, pendingCount }) => (
                    <Card key={article.id}>
                      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 py-4">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-sm font-medium" title={article.title}>
                            {article.title}
                          </CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {liveCount > 0 || pendingCount > 0
                              ? `${liveCount} live · ${pendingCount} pending`
                              : "No placements yet"}
                          </p>
                        </div>
                        <div className="flex flex-none flex-wrap gap-3">
                          <a
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            View article
                          </a>
                          {(liveCount > 0 || pendingCount > 0) && (
                            <Link
                              href={`/admin/affiliate/placements?articleId=${article.id}`}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              View placements →
                            </Link>
                          )}
                          <Link
                            href={`/admin/affiliate/placements?articleId=${article.id}&openAdd=1`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Add placement →
                          </Link>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemsPerPage={PAGE_SIZE}
                  totalItems={filtered.length}
                />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
