"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, matchQuality, Thumbnail } from "@/components/affiliate/admin-ui";
import type { AffiliateProduct, ArticleAffiliateMatch, ArticleLite } from "@/lib/affiliate";

function MatchRow({
  match,
  action,
}: {
  match: ArticleAffiliateMatch;
  action: React.ReactNode;
}) {
  const quality = matchQuality(match.match_score);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white/[0.02] px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail src={match.affiliate_products?.image_url} alt={match.affiliate_products?.name || ""} />
        <div className="min-w-0">
          <Link
            href={`/admin/affiliate/products/${match.product_id}`}
            className="truncate text-sm font-medium hover:underline"
            title={match.affiliate_products?.name}
          >
            {match.affiliate_products?.name}
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
      </div>
      <div className="flex flex-none gap-2">{action}</div>
    </div>
  );
}

export function ArticleDetailBoard({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<ArticleLite | null>(null);
  const [matches, setMatches] = useState<ArticleAffiliateMatch[]>([]);
  const [catalog, setCatalog] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [detailRes, catalogRes] = await Promise.all([
      fetch(`/api/admin/affiliate/articles/${articleId}`).then((r) => r.json()),
      fetch("/api/admin/affiliate/products").then((r) => r.json()),
    ]);

    if (detailRes.error) {
      setNotFound(true);
    } else {
      setArticle(detailRes.article);
      setMatches(detailRes.matches || []);
    }
    setCatalog(catalogRes.products || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const live = useMemo(() => matches.filter((m) => m.approved && m.is_active), [matches]);
  const deactivated = useMemo(() => matches.filter((m) => m.approved && !m.is_active), [matches]);
  const pending = useMemo(() => matches.filter((m) => !m.approved), [matches]);

  const liveProductIds = useMemo(() => new Set(live.map((m) => m.product_id)), [live]);
  const pickerResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return catalog
      .filter((p) => p.name.toLowerCase().includes(query) || (p.brand || "").toLowerCase().includes(query))
      .slice(0, 8);
  }, [catalog, search]);

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

  const addProduct = async (productId: string) => {
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
        ) : notFound || !article ? (
          <p className="mt-8 text-muted-foreground">Article not found.</p>
        ) : (
          <div className="mt-4 grid gap-8">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Article</p>
              <h1 className="mt-2 font-display text-3xl font-bold">{article.title}</h1>
              <a
                href={`/blog/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View article ↗
              </a>
            </div>

            <div>
              <h2 className="mb-3 font-display text-xl font-bold">
                Live ({live.length}) <span className="text-sm font-normal text-muted-foreground">— only the first shows on the article</span>
              </h2>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing live for this article yet.</p>
              ) : (
                <div className="grid gap-2">
                  {live.map((match) => (
                    <MatchRow
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
                    <MatchRow
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
                    <MatchRow
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
                <CardTitle className="text-base">Add a product</CardTitle>
                <CardDescription>
                  Manually attach a product from the catalog, even if the matcher never suggested
                  it. Added products go live immediately.
                </CardDescription>
                <Input
                  placeholder="Search the catalog by name or brand"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-3"
                />
              </CardHeader>
              {pickerResults.length > 0 && (
                <div className="grid gap-2 px-6 pb-6">
                  {pickerResults.map((product) => {
                    const alreadyLive = liveProductIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-white/[0.02] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Thumbnail src={product.image_url} alt={product.name} />
                          <p className="truncate text-sm" title={product.name}>
                            {product.name}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyLive ? "outline" : "default"}
                          disabled={alreadyLive}
                          onClick={() => addProduct(product.id)}
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
