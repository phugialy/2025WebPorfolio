"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { formatDate, matchQuality, Thumbnail } from "@/components/affiliate/admin-ui";
import type { AffiliateProduct, ArticleAffiliateMatch, ArticleLite } from "@/lib/affiliate";

const PAGE_SIZE = 15;

type StatusFilter = "pending" | "live" | "deactivated" | "all";

function statusOf(match: ArticleAffiliateMatch): Exclude<StatusFilter, "all"> {
  if (!match.approved) return "pending";
  return match.is_active ? "live" : "deactivated";
}

function AddPlacementDialog({
  open,
  onClose,
  products,
  articles,
  initialAssetId,
  initialArticleId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  products: AffiliateProduct[];
  articles: ArticleLite[];
  initialAssetId: string | null;
  initialArticleId: string | null;
  onAdded: () => void;
}) {
  const [assetQuery, setAssetQuery] = useState("");
  const [articleQuery, setArticleQuery] = useState("");
  const [assetId, setAssetId] = useState<string | null>(initialAssetId);
  const [articleId, setArticleId] = useState<string | null>(initialArticleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAssetId(initialAssetId);
      setArticleId(initialArticleId);
      setAssetQuery("");
      setArticleQuery("");
      setError(null);
    }
  }, [open, initialAssetId, initialArticleId]);

  const assetResults = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return [];
    return products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6);
  }, [products, assetQuery]);

  const articleResults = useMemo(() => {
    const query = articleQuery.trim().toLowerCase();
    if (!query) return [];
    return articles.filter((a) => a.title.toLowerCase().includes(query)).slice(0, 6);
  }, [articles, articleQuery]);

  const selectedAsset = products.find((p) => p.id === assetId) || null;
  const selectedArticle = articles.find((a) => a.id === articleId) || null;

  const submit = async () => {
    if (!assetId || !articleId) {
      setError("Pick both an asset and an article.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/affiliate/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: assetId, articleId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add placement");
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add placement");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[100] w-full max-w-lg rounded-2xl border bg-background p-6 shadow-lg">
        <h2 className="text-xl font-bold">Add a placement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Attach an asset to an article manually, even if the matcher never suggested it. Goes
          live immediately.
        </p>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Asset</p>
          {selectedAsset ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span className="truncate text-sm">{selectedAsset.name}</span>
              <Button size="sm" variant="outline" onClick={() => setAssetId(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Search assets by name"
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                className="mt-1"
              />
              {assetResults.length > 0 && (
                <div className="mt-1 grid gap-1">
                  {assetResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAssetId(p.id)}
                      className="truncate rounded-lg border px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Article</p>
          {selectedArticle ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span className="truncate text-sm">{selectedArticle.title}</span>
              <Button size="sm" variant="outline" onClick={() => setArticleId(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Search articles by title"
                value={articleQuery}
                onChange={(e) => setArticleQuery(e.target.value)}
                className="mt-1"
              />
              {articleResults.length > 0 && (
                <div className="mt-1 grid gap-1">
                  {articleResults.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setArticleId(a.id)}
                      className="truncate rounded-lg border px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                    >
                      {a.title}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !assetId || !articleId}>
            {saving ? "Adding..." : "Add placement"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PlacementsBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedArticleId = searchParams.get("articleId");
  const scopedAssetId = searchParams.get("assetId");
  const shouldOpenAdd = searchParams.get("openAdd") === "1";

  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [articles, setArticles] = useState<ArticleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    scopedArticleId || scopedAssetId ? "all" : "pending"
  );
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(shouldOpenAdd);

  const load = async () => {
    setLoading(true);
    const [matchesRes, productsRes, articlesRes] = await Promise.all([
      fetch("/api/admin/affiliate/placements?status=all").then((r) => r.json()),
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
      fetch("/api/admin/affiliate/articles-lite").then((r) => r.json()),
    ]);
    setMatches(matchesRes.matches || []);
    setProducts(productsRes.products || []);
    setArticles(articlesRes.articles || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return matches.filter((match) => {
      if (scopedArticleId && match.article_id !== scopedArticleId) return false;
      if (scopedAssetId && match.product_id !== scopedAssetId) return false;
      if (statusFilter !== "all" && statusOf(match) !== statusFilter) return false;
      if (query) {
        const haystack = `${match.articles?.title || ""} ${match.affiliate_products?.name || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [matches, scopedArticleId, scopedAssetId, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approve = async (id: string) => {
    await fetch(`/api/admin/affiliate/placements/${id}`, { method: "PATCH" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/affiliate/placements/${id}`, { method: "DELETE" });
    load();
  };

  const setActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/affiliate/placements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  };

  const scopedArticleTitle = scopedArticleId
    ? matches.find((m) => m.article_id === scopedArticleId)?.articles?.title ||
      articles.find((a) => a.id === scopedArticleId)?.title
    : null;
  const scopedAssetName = scopedAssetId
    ? matches.find((m) => m.product_id === scopedAssetId)?.affiliate_products?.name ||
      products.find((p) => p.id === scopedAssetId)?.name
    : null;

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Every asset-article pairing lives here. Approve what&apos;s pending, deactivate
          what&apos;s live, or attach something new.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="placements" />
        </div>

        {(scopedArticleId || scopedAssetId) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            Filtered to{" "}
            {[
              scopedArticleTitle ? `article "${scopedArticleTitle}"` : null,
              scopedAssetName ? `asset "${scopedAssetName}"` : null,
            ]
              .filter(Boolean)
              .join(" and ")}
            <button
              onClick={() => router.push("/admin/affiliate/placements")}
              className="text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search by article or asset"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="sm:max-w-xs"
                />
                <div className="flex gap-2">
                  {(["pending", "live", "deactivated", "all"] as const).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={statusFilter === option ? "default" : "outline"}
                      onClick={() => {
                        setStatusFilter(option);
                        setPage(1);
                      }}
                    >
                      {option[0].toUpperCase() + option.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setShowAddDialog(true)} className="w-fit">
                Add placement
              </Button>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No placements match</CardTitle>
                  <CardDescription>Try a different search or filter.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="grid gap-2">
                  {pageItems.map((match) => {
                    const status = statusOf(match);
                    const quality = matchQuality(match.match_score);
                    return (
                      <Card key={match.id}>
                        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 py-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Thumbnail
                              src={match.affiliate_products?.image_url}
                              alt={match.affiliate_products?.name || ""}
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/affiliate/products/${match.product_id}`}
                                className="truncate text-sm font-medium hover:underline"
                                title={match.affiliate_products?.name}
                              >
                                {match.affiliate_products?.name}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground" title={match.articles?.title}>
                                on {match.articles?.title || match.article_id}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${quality.className}`}
                                >
                                  {quality.label}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground">{status}</span>
                                {match.approved_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(match.approved_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-none gap-2">
                            {status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => approve(match.id)}>
                                  Approve
                                </Button>
                              </>
                            )}
                            {status === "live" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setActive(match.id, false)}>
                                  Deactivate
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                                  Remove
                                </Button>
                              </>
                            )}
                            {status === "deactivated" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                                  Remove
                                </Button>
                                <Button size="sm" onClick={() => setActive(match.id, true)}>
                                  Reactivate
                                </Button>
                              </>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
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

      <AddPlacementDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        products={products}
        articles={articles}
        initialAssetId={scopedAssetId}
        initialArticleId={scopedArticleId}
        onAdded={() => {
          setShowAddDialog(false);
          load();
        }}
      />
    </main>
  );
}
