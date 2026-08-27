"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AffiliateProduct, ArticleAffiliateMatch } from "@/lib/affiliate";

function EditForm({ product, onSaved }: { product: AffiliateProduct; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand || "");
  const [category, setCategory] = useState(product.category || "");
  const [tags, setTags] = useState((product.tags || []).join(", "));
  const [imageUrl, setImageUrl] = useState(product.image_url || "");
  const [affiliateUrl, setAffiliateUrl] = useState(product.affiliate_url);
  const [description, setDescription] = useState(product.description || "");
  const [promoCode, setPromoCode] = useState(product.promo_code || "");
  const [promoDetails, setPromoDetails] = useState(product.promo_details || "");
  const [buyIf, setBuyIf] = useState(product.buy_if || "");
  const [skipIf, setSkipIf] = useState(product.skip_if || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/affiliate/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brand: brand || null,
          category: category || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          imageUrl: imageUrl || null,
          affiliateUrl,
          description: description || null,
          promoCode: promoCode || null,
          promoDetails: promoDetails || null,
          buyIf: buyIf || null,
          skipIf: skipIf || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Details</CardTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input
            placeholder="Tags, comma separated"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
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
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            placeholder="Promo code (e.g. PHU20) -- optional"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <Input
            placeholder="Promo details (e.g. 20% off) -- optional"
            value={promoDetails}
            onChange={(e) => setPromoDetails(e.target.value)}
          />
          <Textarea
            placeholder="We'd buy this if... -- optional"
            value={buyIf}
            onChange={(e) => setBuyIf(e.target.value)}
            rows={2}
            className="sm:col-span-2"
          />
          <Textarea
            placeholder="We'd skip this if... -- optional"
            value={skipIf}
            onChange={(e) => setSkipIf(e.target.value)}
            rows={2}
            className="sm:col-span-2"
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button onClick={save} disabled={saving} className="mt-4 w-fit">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </CardHeader>
    </Card>
  );
}

export function ProductDetailBoard({ productId }: { productId: string }) {
  const [product, setProduct] = useState<AffiliateProduct | null>(null);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    setLoading(true);
    const detailRes = await fetch(`/api/admin/affiliate/products/${productId}`).then((r) => r.json());

    if (detailRes.error) {
      setNotFound(true);
    } else {
      setProduct(detailRes.product);
      setMatches(detailRes.matches || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const toggleActive = async (id: string, status: "active" | "inactive") => {
    await fetch(`/api/admin/affiliate/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const liveCount = matches.filter((m) => m.approved && m.is_active).length;
  const pendingCount = matches.filter((m) => !m.approved).length;

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/affiliate" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Back to Assets
        </Link>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : notFound || !product ? (
          <p className="mt-8 text-muted-foreground">Asset not found.</p>
        ) : (
          <div className="mt-4 grid gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Asset</p>
                <h1 className="mt-2 font-display text-3xl font-bold">{product.name}</h1>
              </div>
              <Button
                variant={product.status === "active" ? "outline" : "default"}
                onClick={() =>
                  toggleActive(product.id, product.status === "active" ? "inactive" : "active")
                }
              >
                {product.status === "active" ? "Deactivate catalog-wide" : "Activate"}
              </Button>
            </div>

            <EditForm product={product} onSaved={load} />

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {liveCount} live · {pendingCount} pending placements
                  </CardTitle>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/admin/affiliate/placements?assetId=${product.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Manage placements →
                  </Link>
                  <Link
                    href={`/admin/affiliate/placements?assetId=${product.id}&openAdd=1`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Add to an article →
                  </Link>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
