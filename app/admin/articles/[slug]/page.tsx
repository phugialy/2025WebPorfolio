"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, PenLine, ShieldCheck, Upload, XCircle } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { formatDate } from "@/lib/utils";
import { EDITORIAL_LENSES } from "@/lib/editorial";

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
  notes: string | null;
  read_time: number | null;
  views: number | null;
  hero_image_url: string | null;
  image_assets: Array<{ url: string; role: string; alt?: string }> | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  content?: string;
  editorial_lens: string | null;
  phugialy_take: string | null;
  what_wed_do: string | null;
  commercial_relevance_note: string | null;
};

function renderInlineLinks(value: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index));
    }
    parts.push(
      <a key={`${match[2]}-${match.index}`} href={match[2]} target="_blank" rel="noreferrer">
        {match[1]}
      </a>
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return parts;
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none">
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-4" />;
        if (trimmed.startsWith("# ")) {
          return <h1 key={index}>{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={index}>{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={index}>{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith("- ")) {
          return <li key={index}>{renderInlineLinks(trimmed.slice(2))}</li>;
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return <li key={index}>{renderInlineLinks(trimmed.replace(/^\d+\.\s/, ""))}</li>;
        }
        return <p key={index}>{renderInlineLinks(trimmed)}</p>;
      })}
    </div>
  );
}

function JudgmentPanel({
  article,
  onSaved,
}: {
  article: AdminArticle;
  onSaved: (updated: Partial<AdminArticle>) => void;
}) {
  const [lens, setLens] = useState(article.editorial_lens || "");
  const [take, setTake] = useState(article.phugialy_take || "");
  const [whatWedDo, setWhatWedDo] = useState(article.what_wed_do || "");
  const [relevanceNote, setRelevanceNote] = useState(article.commercial_relevance_note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editorialLens: lens,
          phugialyTake: take,
          whatWedDo,
          commercialRelevanceNote: relevanceNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save judgment");
      onSaved(data.article);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save judgment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-10 p-5">
      <h2 className="font-display text-lg font-bold">Phugialy Judgment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin-curated only -- never generated. Leave any field blank to omit it from the public
        page.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Editorial Lens
          <select
            value={lens}
            onChange={(event) => setLens(event.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {EDITORIAL_LENSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Phugialy Take{" "}
          <span className="text-xs font-normal text-muted-foreground">
            one or two sentences, renders near the top of the article
          </span>
          <Textarea
            value={take}
            onChange={(event) => setTake(event.target.value)}
            rows={2}
            placeholder="What do we think is actually happening here?"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          What We&apos;d Do{" "}
          <span className="text-xs font-normal text-muted-foreground">
            renders near the end of the article, after the evidence
          </span>
          <Textarea
            value={whatWedDo}
            onChange={(event) => setWhatWedDo(event.target.value)}
            rows={2}
            placeholder="What's the concrete action or decision?"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Commercial Relevance Note{" "}
          <span className="text-xs font-normal text-muted-foreground">
            internal only -- never shown on the public page
          </span>
          <Textarea
            value={relevanceNote}
            onChange={(event) => setRelevanceNote(event.target.value)}
            rows={2}
            placeholder="Why might this matter to a business reader?"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={saving} className="mt-4 w-fit">
        {saving ? "Saving..." : "Save judgment"}
      </Button>
    </Card>
  );
}

function AdminArticlePreview() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [article, setArticle] = useState<AdminArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadArticle = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load article");
      const found = (data.articles || []).find((item: AdminArticle) => item.slug === slug);
      if (!found) throw new Error("Article not found in admin list");
      setArticle({ ...found, content: found.content || found.ai_summary || "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load article");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const actions = useMemo(() => {
    if (!article) return [];
    const next: Array<{ label: string; status: ArticleStatus; icon: typeof ShieldCheck; variant?: "default" | "outline" }> = [];

    if (["draft", "new"].includes(article.status)) {
      next.push({ label: "Send to Review", status: "reviewed", icon: ShieldCheck, variant: "outline" });
    }
    if (article.status === "reviewed") {
      next.push({ label: "Approve", status: "approved", icon: ShieldCheck });
    }
    if (["reviewed", "approved", "scheduled"].includes(article.status)) {
      next.push({ label: "Publish", status: "published", icon: Upload });
    }
    if (!["published", "rejected", "archived"].includes(article.status)) {
      next.push({ label: "Reject", status: "rejected", icon: XCircle, variant: "outline" });
    }

    return next;
  }, [article]);

  const updateStatus = async (status: ArticleStatus) => {
    if (!article) return;
    setUpdating(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update article");
      setArticle((current) => (current ? { ...current, ...data.article } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update article");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <Card className="p-6 text-muted-foreground">Loading article preview...</Card>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="container mx-auto px-4 py-12">
        <Card className="p-6">
          <h1 className="font-display text-2xl font-bold">Article unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button className="mt-4" asChild>
            <Link href="/admin/blog">Back to Board</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
      <article className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="h-4 w-4" />
              Back to Board
            </Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/workspace/${article.slug}`}>
                <PenLine className="h-4 w-4" />
                Open Workspace
              </Link>
            </Button>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.variant || "default"}
                  disabled={updating}
                  onClick={() => updateStatus(action.status)}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
            {article.status === "published" && (
              <Button size="sm" asChild>
                <Link href={`/blog/${article.slug}`}>
                  Public Page
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <header className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              {article.status}
            </span>
            <time dateTime={article.created_at}>
              {formatDate(article.created_at)}
            </time>
            {article.read_time && <span>{article.read_time} min read</span>}
            {article.portfolio_lane && <span>{article.portfolio_lane}</span>}
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            {article.title}
          </h1>

          {article.ai_summary && (
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {article.ai_summary}
            </p>
          )}

          <div className="mt-5 grid gap-3 border-y py-4 text-sm text-muted-foreground md:grid-cols-4">
            <span>Score {article.editorial_score ?? article.quality_score ?? "-"}</span>
            <span>{article.views ?? 0} views</span>
            <span>{article.image_assets?.length || 0} images</span>
            <span>{article.source_name || "Source"}</span>
          </div>

          {article.hero_image_url && (
            <figure className="mt-8 overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.hero_image_url}
                alt={article.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </figure>
          )}
        </header>

        <JudgmentPanel
          article={article}
          onSaved={(updated) => setArticle((current) => (current ? { ...current, ...updated } : current))}
        />

        <MarkdownPreview content={article.content || ""} />
      </article>
    </main>
  );
}

export default function AdminArticlePreviewPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminArticlePreview />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
