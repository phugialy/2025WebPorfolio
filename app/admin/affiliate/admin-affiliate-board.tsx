"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AffiliateProduct, ArticleAffiliateMatch } from "@/lib/affiliate";

function ProductForm({ onCreated }: { onCreated: () => void }) {
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
          Paste your own Amazon Associates or brand affiliate link. Tags drive matching against
          article tags/lane.
        </CardDescription>
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

export function AdminAffiliateBoard() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [productsRes, matchesRes] = await Promise.all([
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
      fetch("/api/admin/affiliate/matches").then((r) => r.json()),
    ]);
    setProducts(productsRes.products || []);
    setMatches(matchesRes.matches || []);
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
          </div>
        )}
      </div>
    </main>
  );
}
