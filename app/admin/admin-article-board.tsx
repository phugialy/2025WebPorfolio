"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, PenLine, Plus, RefreshCw, Send, ShieldCheck, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ArticleStatus =
  | "draft"
  | "new"
  | "reviewed"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  source_name: string | null;
  canonical_url: string | null;
  tags: string[] | null;
  quality_score: number | null;
  editorial_score: number | null;
  portfolio_lane: string | null;
  ai_summary: string | null;
  read_time: number | null;
  views: number | null;
  hero_image_url: string | null;
  image_assets: Array<{ url: string; role: string }> | null;
  updated_at: string;
  published_at: string | null;
};

const columns: Array<{
  id: string;
  title: string;
  description: string;
  statuses: ArticleStatus[];
}> = [
  {
    id: "new",
    title: "New Approved Articles",
    description: "Fresh drafts and generated candidates ready to inspect.",
    statuses: ["new", "draft"],
  },
  {
    id: "review",
    title: "Reviews",
    description: "Papers that need tone, SEO, source, and portfolio review.",
    statuses: ["reviewed"],
  },
  {
    id: "approved",
    title: "Approved",
    description: "Ready for publish or schedule.",
    statuses: ["approved", "scheduled"],
  },
  {
    id: "published",
    title: "Published",
    description: "Live on the public blog.",
    statuses: ["published"],
  },
];

function statusLabel(status: ArticleStatus) {
  return status.replace("-", " ");
}

export function AdminArticleBoard() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadArticles = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load admin articles");
      setArticles(data.articles || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load admin articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const counts = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        count: articles.filter((article) => column.statuses.includes(article.status)).length,
      })),
    [articles]
  );

  const updateStatus = async (article: AdminArticle, status: ArticleStatus) => {
    setUpdatingId(article.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update article");
      setArticles((current) =>
        current.map((item) => (item.id === article.id ? data.article : item))
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update article");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-6 text-muted-foreground">Loading article board...</Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Article Operations</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Publishing Control Board</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Review generated papers, move them through editorial stages, and publish only the pieces that fit the portfolio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/articles/new">
                <Plus className="h-4 w-4" />
                New Article
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={loadArticles}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((count) => (
            <div key={count.id} className="rounded-lg border bg-card p-4">
              <div className="text-2xl font-bold">{count.count}</div>
              <div className="text-sm capitalize text-muted-foreground">{count.id}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => {
            const columnArticles = articles.filter((article) =>
              column.statuses.includes(article.status)
            );

            return (
              <section key={column.id} className="min-w-0 rounded-xl border bg-muted/20 p-3">
                <div className="mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold">{column.title}</h2>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {columnArticles.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {column.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {columnArticles.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                      No papers here.
                    </div>
                  )}

                  {columnArticles.map((article) => (
                    <Card key={article.id} className="overflow-hidden p-0">
                      {article.hero_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={article.hero_image_url}
                          alt=""
                          className="aspect-[16/9] w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                            {statusLabel(article.status)}
                          </span>
                          {article.portfolio_lane && <span>{article.portfolio_lane}</span>}
                        </div>
                        <h3 className="line-clamp-3 font-semibold leading-snug">
                          {article.title}
                        </h3>
                        {article.ai_summary && (
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {article.ai_summary}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>Score {article.editorial_score ?? article.quality_score ?? "-"}</span>
                          <span>{article.read_time ?? "-"} min</span>
                          <span>{article.views ?? 0} views</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/articles/${article.slug}`}>
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/workspace/${article.slug}`}>
                              <PenLine className="h-3.5 w-3.5" />
                              Workspace
                            </Link>
                          </Button>
                          {article.canonical_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={article.canonical_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Source
                              </a>
                            </Button>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["draft", "new"].includes(article.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === article.id}
                              onClick={() => updateStatus(article, "reviewed")}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Review
                            </Button>
                          )}
                          {article.status === "reviewed" && (
                            <Button
                              size="sm"
                              disabled={updatingId === article.id}
                              onClick={() => updateStatus(article, "approved")}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          )}
                          {["approved", "scheduled", "reviewed"].includes(article.status) && (
                            <Button
                              size="sm"
                              disabled={updatingId === article.id}
                              onClick={() => updateStatus(article, "published")}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Publish
                            </Button>
                          )}
                          {!["published", "rejected", "archived"].includes(article.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn("text-destructive hover:text-destructive")}
                              disabled={updatingId === article.id}
                              onClick={() => updateStatus(article, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
