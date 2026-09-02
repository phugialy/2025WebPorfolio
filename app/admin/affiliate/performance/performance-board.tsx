"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminAffiliateTabs } from "@/components/affiliate/admin-tabs";
import { Thumbnail, formatDate } from "@/components/affiliate/admin-ui";
import { cn } from "@/lib/utils";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string | null;
  daysSincePublished: number;
  viewsPerDay: number;
};

type ProductRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
  category: string | null;
  network: string;
  imageUrl: string | null;
  clicks: number;
  impressions: number;
  ctr: number | null;
  lastClickAt: string | null;
};

type ProductLeaderboardRow = {
  productId: string;
  productName: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
};

type WindowStats = {
  topArticles: ArticleRow[];
  topProducts: ProductLeaderboardRow[];
};

type Report = {
  overview: {
    totalArticles: number;
    totalViews: number;
    totalClicks: number;
    totalImpressions: number;
    overallCtr: number | null;
  };
  daily: WindowStats;
  monthly: WindowStats;
  fullProductList: ProductRow[];
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {sub && <CardDescription>{sub}</CardDescription>}
      </CardHeader>
    </Card>
  );
}

function ArticleTable({ rows, emptyLabel }: { rows: ArticleRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Article</th>
            <th className="py-2 pr-3 text-right">Views</th>
            <th className="py-2 pr-3 text-right">Views/day</th>
            <th className="py-2 pr-3 text-right">Published</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b last:border-0">
              <td className="max-w-xs truncate py-2 pr-3">
                <Link href={`/blog/${a.slug}`} className="hover:underline" title={a.title} target="_blank">
                  {a.title}
                </Link>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{a.views.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{a.viewsPerDay}</td>
              <td className="py-2 pr-3 text-right text-muted-foreground">
                {a.publishedAt ? formatDate(a.publishedAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductLeaderboard({ rows }: { rows: ProductLeaderboardRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No clicks in this window.</p>;
  }
  return (
    <div className="grid gap-2">
      {rows.map((p) => (
        <div key={p.productId} className="flex items-center justify-between text-sm">
          <span className="truncate pr-2">{p.productName}</span>
          <span className="flex-none text-muted-foreground">
            {p.clicks} clicks / {p.impressions} shown
            {p.ctr !== null ? ` · ${(p.ctr * 100).toFixed(1)}% CTR` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function WindowSection({ stats, emptyArticlesLabel }: { stats: WindowStats; emptyArticlesLabel: string }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top articles</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <ArticleTable rows={stats.topArticles} emptyLabel={emptyArticlesLabel} />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top products</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <ProductLeaderboard rows={stats.topProducts} />
        </div>
      </Card>
    </div>
  );
}

type SortKey = "clicks" | "impressions" | "ctr";

function SortHeader({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey | null;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort === sortKey;
  const Icon = isActive ? (direction === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <th className="py-2 pr-3 text-right">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          isActive && "text-foreground"
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function FullProductList({ products }: { products: ProductRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "Uncategorized"));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter !== "all" && (p.category || "Uncategorized") !== categoryFilter) return false;
      if (query && !p.name.toLowerCase().includes(query)) return false;
      return true;
    });

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = sortKey === "ctr" ? a.ctr ?? -1 : a[sortKey];
        const bv = sortKey === "ctr" ? b.ctr ?? -1 : b[sortKey];
        return sortDir === "desc" ? bv - av : av - bv;
      });
    }

    return rows;
  }, [products, search, statusFilter, categoryFilter, sortKey, sortDir]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Full product list ({filtered.length} of {products.length})</CardTitle>
        <CardDescription>Every asset in the catalog, active and inactive, with performance.</CardDescription>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <div className="overflow-x-auto px-6 pb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Category</th>
              <SortHeader label="Clicks" sortKey="clicks" activeSort={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="Impressions" sortKey="impressions" activeSort={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="CTR" sortKey="ctr" activeSort={sortKey} direction={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">
                  No products match.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Thumbnail src={p.imageUrl} alt={p.name} />
                      <Link
                        href={`/admin/affiliate/products/${p.id}`}
                        className="max-w-[220px] truncate hover:underline"
                        title={p.name}
                      >
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={p.status === "active" ? "text-emerald-500" : "text-muted-foreground"}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.category || "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.clicks}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.impressions}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {p.ctr !== null ? `${(p.ctr * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type SubTab = "daily" | "monthly" | "products";

export function PerformanceBoard() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("daily");

  useEffect(() => {
    fetch("/api/admin/performance")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReport(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Affiliate Manager</h1>
        <p className="mt-3 text-muted-foreground">
          Performance report: visits, click-through, and top performers across articles and
          affiliate assets. Bot traffic already excluded from every click/impression number.
        </p>

        <div className="mt-6">
          <AdminAffiliateTabs active="performance" />
        </div>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}
        {error && <p className="mt-8 text-destructive">Error: {error}</p>}

        {report && (
          <div className="mt-8 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total views"
                value={report.overview.totalViews.toLocaleString()}
                sub={`${report.overview.totalArticles} published articles`}
              />
              <StatCard label="Affiliate clicks" value={report.overview.totalClicks.toLocaleString()} />
              <StatCard label="Pick impressions" value={report.overview.totalImpressions.toLocaleString()} />
              <StatCard
                label="Overall CTR"
                value={report.overview.overallCtr !== null ? `${(report.overview.overallCtr * 100).toFixed(1)}%` : "—"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { key: "daily", label: "Daily" },
                { key: "monthly", label: "Monthly" },
                { key: "products", label: "Full Product List" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSubTab(tab.key)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    subTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-background hover:bg-white/[0.04]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {subTab === "daily" && (
              <>
                <p className="-mb-2 text-xs text-muted-foreground">
                  Top products use real last-24h click/impression timestamps. Top articles can
                  only mean &quot;published in the last 24h, ranked by lifetime views&quot; --
                  views has no historical snapshots to compute true same-day traffic from.
                </p>
                <WindowSection stats={report.daily} emptyArticlesLabel="Nothing published in the last 24 hours." />
              </>
            )}

            {subTab === "monthly" && (
              <>
                <p className="-mb-2 text-xs text-muted-foreground">
                  Top products use real last-30-day click/impression timestamps. Top articles
                  mean &quot;published in the last 30 days, ranked by lifetime views&quot; -- same
                  caveat as Daily.
                </p>
                <WindowSection stats={report.monthly} emptyArticlesLabel="Nothing published in the last 30 days." />
              </>
            )}

            {subTab === "products" && <FullProductList products={report.fullProductList} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average reading time -- not tracked yet</CardTitle>
                <CardDescription>
                  Nothing in this codebase measures time-on-page today. GA4 already computes this
                  for free with zero new code: Reports → Engagement → Pages and screens →
                  &quot;Average engagement time&quot; per URL. Pulling it into this report instead
                  would mean a real new integration (the GA4 Data API) -- worth doing only if you
                  want it here specifically rather than in the GA4 dashboard you already have.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
