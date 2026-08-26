"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, matchQuality } from "@/components/affiliate/admin-ui";
import type { AffiliateProduct, ArticleAffiliateMatch, ArticleLite } from "@/lib/affiliate";

function ArticleMatchRow({
  match,
  action,
}: {
  match: ArticleAffiliateMatch;
  action: React.ReactNode;
}) {
  const quality = matchQuality(match.match_score);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <Link
          href={`/admin/affiliate/articles/${match.article_id}`}
          className="truncate text-sm font-medium hover:underline"
          title={match.articles?.title}
        >
          {match.articles?.title || match.article_id}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${quality.className}`}
          >
            {quality.label}
          </span>
          {match.approved_at && (
            <span className="text-[10px] text-muted-foreground">
              {match.approved ? "approved" : "removed"} {formatDate(match.approved_at)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-none gap-2">{action}</div>
    </div>
  );
}

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
  const [articles, setArticles] = useState<ArticleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [detailRes, articlesRes] = await Promise.all([
      fetch(`/api/admin/affiliate/products/${productId}`).then((r) => r.json()),
      fetch("/api/admin/affiliate/articles-lite").then((r) => r.json()),
    ]);

    if (detailRes.error) {
      setNotFound(true);
    } else {
      setProduct(detailRes.product);
      setMatches(detailRes.matches || []);
    }
    setArticles(articlesRes.articles || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const live = useMemo(() => matches.filter((m) => m.approved && m.is_active), [matches]);
  const deactivated = useMemo(() => matches.filter((m) => m.approved && !m.is_active), [matches]);
  const pending = useMemo(() => matches.filter((m) => !m.approved), [matches]);

  const liveArticleIds = useMemo(() => new Set(live.map((m) => m.article_id)), [live]);
  const pickerResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return articles.filter((a) => a.title.toLowerCase().includes(query)).slice(0, 8);
  }, [articles, search]);

  const toggleActive = async (id: string, status: "active" | "inactive") => {
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

  const remove = async (id: string) => {
    await fetch(`/api/admin/affiliate/matches/${id}`, { method: "DELETE" });
    load();
  };

  const setActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/affiliate/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  };

  const addToArticle = async (articleId: string) => {
    await fetch(`/api/admin/affiliate/articles/${articleId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setSearch("");
    load();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/affiliate" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Back to affiliate layer
        </Link>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : notFound || !product ? (
          <p className="mt-8 text-muted-foreground">Product not found.</p>
        ) : (
          <div className="mt-4 grid gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Product</p>
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

            <div>
              <h2 className="mb-3 font-display text-xl font-bold">Live on ({live.length})</h2>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not live on any article yet.</p>
              ) : (
                <div className="grid gap-2">
                  {live.map((match) => (
                    <ArticleMatchRow
                      key={match.id}
                      match={match}
                      action={
                        <>
                          <Button size="sm" variant="outline" onClick={() => setActive(match.id, false)}>
                            Deactivate
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                            Remove
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {pending.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-xl font-bold">Pending ({pending.length})</h2>
                <div className="grid gap-2">
                  {pending.map((match) => (
                    <ArticleMatchRow
                      key={match.id}
                      match={match}
                      action={
                        <>
                          <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => approve(match.id)}>
                            Approve
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {deactivated.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-xl font-bold">Deactivated ({deactivated.length})</h2>
                <div className="grid gap-2">
                  {deactivated.map((match) => (
                    <ArticleMatchRow
                      key={match.id}
                      match={match}
                      action={
                        <>
                          <Button size="sm" variant="outline" onClick={() => remove(match.id)}>
                            Remove
                          </Button>
                          <Button size="sm" onClick={() => setActive(match.id, true)}>
                            Reactivate
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add to an article</CardTitle>
                <CardDescription>
                  Attach this product to an article the matcher didn&apos;t suggest it for. Goes
                  live immediately.
                </CardDescription>
                <Input
                  placeholder="Search articles by title"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-3"
                />
              </CardHeader>
              {pickerResults.length > 0 && (
                <div className="grid gap-2 px-6 pb-6">
                  {pickerResults.map((articleLite) => {
                    const alreadyLive = liveArticleIds.has(articleLite.id);
                    return (
                      <div
                        key={articleLite.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-white/[0.02] px-3 py-2"
                      >
                        <p className="truncate text-sm" title={articleLite.title}>
                          {articleLite.title}
                        </p>
                        <Button
                          size="sm"
                          variant={alreadyLive ? "outline" : "default"}
                          disabled={alreadyLive}
                          onClick={() => addToArticle(articleLite.id)}
                        >
                          {alreadyLive ? "Already live" : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
