"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { formatDate, Thumbnail } from "@/components/affiliate/admin-ui";
import type { AffiliateClickStats, AffiliateProduct, ArticleAffiliateMatch } from "@/lib/affiliate";

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

type AssetRow = {
  product: AffiliateProduct;
  pendingCount: number;
  approvedCount: number;
  clicks: number;
  lastClickAt: string | null;
};

const EMPTY_CLICK_STATS: AffiliateClickStats = {
  totalClicks: 0,
  totalImpressions: 0,
  byProduct: [],
  byArticle: [],
  recent: [],
  botTotal: 0,
  botRecent: [],
};

export function AssetsBoard() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [clickStats, setClickStats] = useState<AffiliateClickStats>(EMPTY_CLICK_STATS);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const [productsRes, matchesRes, clicksRes] = await Promise.all([
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
      fetch("/api/admin/affiliate/placements?status=all").then((r) => r.json()),
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

  const rows = useMemo<AssetRow[]>(() => {
    const clicksByProduct = new Map(clickStats.byProduct.map((p) => [p.productId, p]));
    return products
      .map((product) => {
        const productMatches = matches.filter((m) => m.product_id === product.id);
        const click = clicksByProduct.get(product.id);
        return {
          product,
          pendingCount: productMatches.filter((m) => !m.approved).length,
          approvedCount: productMatches.filter((m) => m.approved && m.is_active).length,
          clicks: click?.clicks || 0,
          lastClickAt: click?.lastClickAt || null,
        };
      })
      .sort((a, b) => {
        // Inactive (needs-your-call) products surface first -- they have
        // zero clicks and zero approved matches by definition, so sorting
        // purely by engagement buried every new import on the last page,
        // exactly where nothing waiting on a decision should be.
        if (a.product.status !== b.product.status) {
          return a.product.status === "inactive" ? -1 : 1;
        }
        if (a.product.status === "inactive") {
          return new Date(b.product.created_at).getTime() - new Date(a.product.created_at).getTime();
        }
        return b.clicks - a.clicks || b.approvedCount - a.approvedCount;
      });
  }, [products, matches, clickStats]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.product.status !== statusFilter) return false;
      if (!query) return true;
      return (
        row.product.name.toLowerCase().includes(query) ||
        (row.product.category || "").toLowerCase().includes(query) ||
        (row.product.brand || "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Assets is your affiliate-link library. See where an asset is used under Placements, or
          which articles still need one under Articles.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="assets" />
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search by name, brand, or category"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="sm:max-w-xs"
                />
                <div className="flex gap-1 rounded-md border border-input p-1">
                  {(["all", "inactive", "active"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setPage(1);
                      }}
                      className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                        statusFilter === status
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {status === "inactive" ? "Needs review" : status}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setShowAddProduct(true)} className="w-fit">
                Add asset
              </Button>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No assets match</CardTitle>
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
                            <div className="mt-1 flex gap-3">
                              <Link
                                href={`/admin/affiliate/products/${product.id}`}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                Manage →
                              </Link>
                              <Link
                                href={`/admin/affiliate/placements?assetId=${product.id}`}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                View placements →
                              </Link>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant={product.status === "active" ? "outline" : "default"}
                          className="flex-none"
                          onClick={() =>
                            toggleProduct(product.id, product.status === "active" ? "inactive" : "active")
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
        )}
      </div>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add an asset</DialogTitle>
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
