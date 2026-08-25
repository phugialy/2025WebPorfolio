"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AffiliateClickStats, AffiliateProduct, ArticleAffiliateMatch } from "@/lib/affiliate";

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
    <Card>
      <CardHeader>
        <CardTitle>Add a product</CardTitle>
        <CardDescription>
          Paste a product link (Amazon short or full link, or any brand page) and fetch its
          details, or fill in the fields yourself below.
        </CardDescription>
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
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            className="md:col-span-2"
          />
          <Input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="md:col-span-2"
          />
          <Input
            placeholder="Affiliate URL"
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            className="md:col-span-2"
          />
          <Input
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="md:col-span-2"
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button onClick={submit} disabled={submitting} className="mt-4 w-fit">
          {submitting ? "Adding..." : "Add product"}
        </Button>
      </CardHeader>
    </Card>
  );
}

function ProductList({
  products,
  onToggle,
}: {
  products: AffiliateProduct[];
  onToggle: (id: string, status: "active" | "inactive") => void;
}) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No products yet</CardTitle>
          <CardDescription>Add one above to seed the catalog.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {products.map((product) => (
        <Card key={product.id}>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <CardDescription>
                {product.brand ? `${product.brand} · ` : ""}
                {product.network} · {product.category || "uncategorized"} ·{" "}
                {(product.tags || []).join(", ") || "no tags"}
              </CardDescription>
            </div>
            <Button
              variant={product.status === "active" ? "outline" : "default"}
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
  );
}

function MatchQueue({
  matches,
  onApprove,
  onReject,
}: {
  matches: ArticleAffiliateMatch[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No pending matches</CardTitle>
          <CardDescription>
            The matcher cron will suggest products for published articles here once the catalog
            has entries.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {matches.map((match) => (
        <Card key={match.id}>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">
                {match.affiliate_products?.name} → {match.articles?.title || match.article_id}
              </CardTitle>
              <CardDescription>
                score {match.match_score} · {match.match_reason}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onReject(match.id)}>
                Reject
              </Button>
              <Button onClick={() => onApprove(match.id)}>Approve</Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ClickStats({ stats }: { stats: AffiliateClickStats }) {
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
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total outbound clicks: {stats.totalClicks}</CardTitle>
          <CardDescription>Logged server-side on every /api/affiliate/go redirect.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By product</CardTitle>
          </CardHeader>
          <div className="grid gap-2 px-6 pb-6">
            {stats.byProduct.map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{p.productName}</span>
                <span className="flex-none text-muted-foreground">
                  {p.clicks} · {formatDate(p.lastClickAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By article</CardTitle>
          </CardHeader>
          <div className="grid gap-2 px-6 pb-6">
            {stats.byArticle.map((a) => (
              <div key={a.articleSlug} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{a.articleTitle || a.articleSlug}</span>
                <span className="flex-none text-muted-foreground">
                  {a.clicks} · {formatDate(a.lastClickAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent clicks</CardTitle>
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
    </div>
  );
}

export function AdminAffiliateBoard() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [clickStats, setClickStats] = useState<AffiliateClickStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [productsRes, matchesRes, clicksRes] = await Promise.all([
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
      fetch("/api/admin/affiliate/matches").then((r) => r.json()),
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

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate layer</h1>
        <p className="mt-3 text-muted-foreground">
          Add products, review auto-matched suggestions, and approve what actually shows up on
          article pages. Nothing goes live until you approve it here.
        </p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-8">
            <ProductForm onCreated={load} />

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold">
                Catalog ({products.length})
              </h2>
              <ProductList products={products} onToggle={toggleProduct} />
            </div>

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold">
                Pending matches ({matches.length})
              </h2>
              <MatchQueue matches={matches} onApprove={approve} onReject={reject} />
            </div>

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold">Click activity</h2>
              <ClickStats stats={clickStats || { totalClicks: 0, byProduct: [], byArticle: [], recent: [] }} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
