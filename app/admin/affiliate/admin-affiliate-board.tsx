"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, matchQuality, Thumbnail } from "@/components/affiliate/admin-ui";
import type { AffiliateClickStats, AffiliateProduct, ArticleAffiliateMatch } from "@/lib/affiliate";

const ARTICLES_PER_PAGE = 15;
const PRODUCTS_PER_PAGE = 10;

function ProductForm({ onCreated }: { onCreated: () => void }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [network, setNetwork] = useState<"amazon" | "other">("amazon");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromLink = async () => {
    if (!sourceUrl.trim()) {
      setFetchError("Paste a link first.");
      return;
    }

    setFetching(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/admin/affiliate/fetch-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch link");
      }

      const { preview } = await response.json();
      setName(preview.name || "");
      setDescription(preview.description || "");
      setImageUrl(preview.imageUrl || "");
      setNetwork(preview.network);
      setAffiliateUrl(preview.affiliateUrl || "");

      if (preview.network === "amazon" && preview.affiliateUrl && !preview.affiliateUrl.includes("tag=")) {
        setFetchError(
          "Fetched, but no Amazon Associate tag is configured yet -- this link won't earn commission until AMAZON_ASSOCIATE_TAG is set."
        );
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch link");
    } finally {
      setFetching(false);
    }
  };

  const submit = async () => {
    if (!name || !affiliateUrl) {
      setError("Name and affiliate URL are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/affiliate/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brand: brand || undefined,
          network,
          category: category || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          imageUrl: imageUrl || undefined,
          affiliateUrl,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create product");
      }

      setName("");
      setBrand("");
      setCategory("");
      setTags("");
      setImageUrl("");
      setAffiliateUrl("");
      setDescription("");
      setSourceUrl("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Paste a product link (Amazon short or full link, or any brand page) and fetch its
        details, or fill in the fields yourself below.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Paste a product link (amzn.to/... or full URL)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={fetchFromLink} disabled={fetching}>
          {fetching ? "Fetching..." : "Fetch details"}
        </Button>
      </div>
      {fetchError && <p className="mt-2 text-sm text-destructive">{fetchError}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Brand (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as "amazon" | "other")}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="amazon">Amazon</option>
          <option value="other">Other brand</option>
        </select>
        <Input
          placeholder="Category (e.g. AI Advancement)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Input
          placeholder="Tags, comma separated"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          placeholder="Affiliate URL"
          value={affiliateUrl}
          onChange={(e) => setAffiliateUrl(e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={submitting} className="mt-4 w-fit">
        {submitting ? "Adding..." : "Add product"}
      </Button>
    </div>
  );
}

// --- By article ---

type ArticleGroup = {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  matches: ArticleAffiliateMatch[];
  hasApproved: boolean;
  pendingCount: number;
  latestActivity: string;
};

function groupByArticle(matches: ArticleAffiliateMatch[]): ArticleGroup[] {
  const map = new Map<string, ArticleGroup>();

  for (const match of matches) {
    const articleId = match.article_id;
    let group = map.get(articleId);
    if (!group) {
      group = {
        articleId,
        articleTitle: match.articles?.title || articleId,
        articleSlug: match.articles?.slug || "",
        matches: [],
        hasApproved: false,
        pendingCount: 0,
        latestActivity: match.created_at,
      };
      map.set(articleId, group);
    }
    group.matches.push(match);
    if (match.approved) group.hasApproved = true;
    else group.pendingCount += 1;
    if (match.created_at > group.latestActivity) group.latestActivity = match.created_at;
  }

  for (const group of map.values()) {
    group.matches.sort((a, b) => {
      if (a.approved !== b.approved) return a.approved ? -1 : 1;
      return (b.match_score || 0) - (a.match_score || 0);
    });
  }

  return Array.from(map.values()).sort((a, b) => (a.latestActivity < b.latestActivity ? 1 : -1));
}

function ArticleGroupCard({
  group,
  onApprove,
  onReject,
}: {
  group: ArticleGroup;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const liveCount = group.matches.filter((m) => m.approved).length;
  const pendingMatches = group.matches.filter((m) => !m.approved);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{group.articleTitle}</CardTitle>
          {liveCount > 0 && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {liveCount} live
            </span>
          )}
          {group.pendingCount > 0 && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              {group.pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {group.articleSlug && (
            <a
              href={`/blog/${group.articleSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              View article
            </a>
          )}
          <Link
            href={`/admin/affiliate/articles/${group.articleId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Manage →
          </Link>
        </div>
      </CardHeader>
      {pendingMatches.length > 0 && (
        <div className="grid gap-2 px-6 pb-6">
          {pendingMatches.map((match) => {
            const quality = matchQuality(match.match_score);
            return (
              <div
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white/[0.02] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Thumbnail
                    src={match.affiliate_products?.image_url}
                    alt={match.affiliate_products?.name || ""}
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      title={match.affiliate_products?.name}
                    >
                      {match.affiliate_products?.name}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${quality.className}`}
                    >
                      {quality.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-none gap-2">
                  <Button size="sm" variant="outline" onClick={() => onReject(match.id)}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => onApprove(match.id)}>
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ByArticleView({
  matches,
  onApprove,
  onReject,
}: {
  matches: ArticleAffiliateMatch[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs-review" | "live">("all");
  const [page, setPage] = useState(1);

  const groups = useMemo(() => groupByArticle(matches), [matches]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (query && !group.articleTitle.toLowerCase().includes(query)) return false;
      if (statusFilter === "needs-review" && group.pendingCount === 0) return false;
      if (statusFilter === "live" && !group.hasApproved) return false;
      return true;
    });
  }, [groups, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLES_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE);

  return (
    <div className="grid gap-4">
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
        <div className="flex gap-2">
          {(["all", "needs-review", "live"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={statusFilter === option ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(option);
                setPage(1);
              }}
            >
              {option === "all" ? "All" : option === "needs-review" ? "Needs review" : "Live"}
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
          <div className="grid gap-3">
            {pageItems.map((group) => (
              <ArticleGroupCard
                key={group.articleId}
                group={group}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsPerPage={ARTICLES_PER_PAGE}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  );
}

// --- By product ---

type ProductRow = {
  product: AffiliateProduct;
  pendingCount: number;
  approvedCount: number;
  clicks: number;
  lastClickAt: string | null;
};

function ByProductView({
  products,
  matches,
  clickStats,
  onToggle,
  onAddProduct,
}: {
  products: AffiliateProduct[];
  matches: ArticleAffiliateMatch[];
  clickStats: AffiliateClickStats;
  onToggle: (id: string, status: "active" | "inactive") => void;
  onAddProduct: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo<ProductRow[]>(() => {
    const clicksByProduct = new Map(clickStats.byProduct.map((p) => [p.productId, p]));
    return products
      .map((product) => {
        const productMatches = matches.filter((m) => m.product_id === product.id);
        const click = clicksByProduct.get(product.id);
        return {
          product,
          pendingCount: productMatches.filter((m) => !m.approved).length,
          approvedCount: productMatches.filter((m) => m.approved).length,
          clicks: click?.clicks || 0,
          lastClickAt: click?.lastClickAt || null,
        };
      })
      .sort((a, b) => b.clicks - a.clicks || b.approvedCount - a.approvedCount);
  }, [products, matches, clickStats]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.product.name.toLowerCase().includes(query) ||
        (row.product.category || "").toLowerCase().includes(query) ||
        (row.product.brand || "").toLowerCase().includes(query)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, brand, or category"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Button onClick={onAddProduct} className="w-fit">
          Add product
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No products match</CardTitle>
            <CardDescription>Try a different search, or add one.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {pageItems.map(({ product, pendingCount, approvedCount, clicks, lastClickAt }) => (
              <Card key={product.id}>
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Thumbnail src={product.image_url} alt={product.name} />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base" title={product.name}>
                        {product.name}
                      </CardTitle>
                      <CardDescription>
                        {product.brand ? `${product.brand} · ` : ""}
                        {product.network} · {product.category || "uncategorized"}
                      </CardDescription>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {approvedCount} live · {pendingCount} pending · {clicks} clicks
                        {lastClickAt ? ` · last ${formatDate(lastClickAt)}` : ""}
                      </p>
                      <Link
                        href={`/admin/affiliate/products/${product.id}`}
                        className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                  <Button
                    variant={product.status === "active" ? "outline" : "default"}
                    className="flex-none"
                    onClick={() =>
                      onToggle(product.id, product.status === "active" ? "inactive" : "active")
                    }
                  >
                    {product.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsPerPage={PRODUCTS_PER_PAGE}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  );
}

// --- Click activity ---

function ClickStatsPanel({ stats }: { stats: AffiliateClickStats }) {
  if (stats.totalClicks === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No clicks yet</CardTitle>
          <CardDescription>
            Every outbound click on a resource card is logged here automatically once readers
            start clicking through.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent clicks ({stats.totalClicks} total)</CardTitle>
      </CardHeader>
      <div className="grid gap-2 px-6 pb-6">
        {stats.recent.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span className="truncate pr-2">
              {r.productName} from {r.articleTitle || r.articleSlug || "unknown page"}
            </span>
            <span className="flex-none text-muted-foreground">{formatDate(r.createdAt)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Root ---

const EMPTY_CLICK_STATS: AffiliateClickStats = { totalClicks: 0, byProduct: [], byArticle: [], recent: [] };

export function AdminAffiliateBoard() {
  const [view, setView] = useState<"article" | "product">("article");
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [clickStats, setClickStats] = useState<AffiliateClickStats>(EMPTY_CLICK_STATS);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const load = async () => {
    setLoading(true);
    const [productsRes, matchesRes, clicksRes] = await Promise.all([
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
      fetch("/api/admin/affiliate/matches?status=all").then((r) => r.json()),
      fetch("/api/admin/affiliate/clicks").then((r) => r.json()),
    ]);
    setProducts(productsRes.products || []);
    setMatches(matchesRes.matches || []);
    setClickStats(clicksRes);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleProduct = async (id: string, status: "active" | "inactive") => {
    await fetch(`/api/admin/affiliate/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const approve = async (id: string) => {
    await fetch(`/api/admin/affiliate/matches/${id}`, { method: "PATCH" });
    load();
  };

  const reject = async (id: string) => {
    await fetch(`/api/admin/affiliate/matches/${id}`, { method: "DELETE" });
    load();
  };

  const pendingCount = matches.filter((m) => !m.approved).length;
  const liveCount = matches.filter((m) => m.approved).length;

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate layer</h1>
        <p className="mt-3 text-muted-foreground">
          Review auto-matched suggestions and approve what actually shows up on article pages.
          Nothing goes live until you approve it here.
        </p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-8">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={view === "article" ? "default" : "outline"}
                onClick={() => setView("article")}
              >
                By article ({pendingCount} pending, {liveCount} live)
              </Button>
              <Button
                variant={view === "product" ? "default" : "outline"}
                onClick={() => setView("product")}
              >
                By product ({products.length})
              </Button>
            </div>

            {view === "article" ? (
              <ByArticleView matches={matches} onApprove={approve} onReject={reject} />
            ) : (
              <ByProductView
                products={products}
                matches={matches}
                clickStats={clickStats}
                onToggle={toggleProduct}
                onAddProduct={() => setShowAddProduct(true)}
              />
            )}

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold">Click activity</h2>
              <ClickStatsPanel stats={clickStats} />
            </div>
          </div>
        )}
      </div>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a product</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ProductForm
              onCreated={() => {
                setShowAddProduct(false);
                load();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
