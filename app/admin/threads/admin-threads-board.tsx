"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Thread } from "@/lib/threads";
import type { ArticleLite } from "@/lib/articles";

function Composer({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [articleQuery, setArticleQuery] = useState("");
  const [articleId, setArticleId] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleLite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/affiliate/articles-lite")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []));
  }, []);

  const articleResults = useMemo(() => {
    const query = articleQuery.trim().toLowerCase();
    if (!query) return [];
    return articles.filter((a) => a.title.toLowerCase().includes(query)).slice(0, 6);
  }, [articles, articleQuery]);

  const selectedArticle = articles.find((a) => a.id === articleId) || null;

  const submit = async (status: "draft" | "published") => {
    if (!body.trim()) {
      setError("Write something first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          body: body.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          articleId: articleId || undefined,
          status,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({}));
        throw new Error(responseBody.error || "Failed to save field note");
      }

      setTitle("");
      setBody("");
      setTags("");
      setArticleId(null);
      setArticleQuery("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Field Note</CardTitle>
        <CardDescription>
          Short, direct, your own voice -- ongoing observations, not a considered argument. No
          pipeline, no review queue, no replies.
        </CardDescription>
        <div className="mt-4 grid gap-3">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="What are you noticing right now?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[140px]"
          />
          <Input
            placeholder="Tags, comma separated (optional)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Link to an article (optional)
            </p>
            {selectedArticle ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
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
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={() => submit("published")} disabled={submitting}>
            {submitting ? "Posting..." : "Post"}
          </Button>
          <Button variant="outline" onClick={() => submit("draft")} disabled={submitting}>
            Save as draft
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function ThreadList({
  threads,
  onToggle,
  onDelete,
}: {
  threads: Thread[];
  onToggle: (id: string, status: "draft" | "published") => void;
  onDelete: (id: string) => void;
}) {
  if (threads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Field Notes yet</CardTitle>
          <CardDescription>Post one above.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {threads.map((thread) => (
        <Card key={thread.id}>
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {thread.title && <CardTitle className="text-base">{thread.title}</CardTitle>}
                <CardDescription className="line-clamp-3 whitespace-pre-wrap">
                  {thread.body}
                </CardDescription>
                {thread.articles && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Linked to: {thread.articles.title}
                  </p>
                )}
              </div>
              <span
                className={
                  thread.status === "published"
                    ? "shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    : "shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                {thread.status}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onToggle(thread.id, thread.status === "published" ? "draft" : "published")
                }
              >
                {thread.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(thread.id)}>
                Delete
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function AdminThreadsBoard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/threads").then((r) => r.json());
    setThreads(response.threads || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string, status: "draft" | "published") => {
    await fetch(`/api/admin/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/threads/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Field Notes</h1>
        <p className="mt-3 text-muted-foreground">
          Short, ongoing commentary in your own voice -- observations, follow-ups, what
          you&apos;re seeing. Separate from the article pipeline; nothing here is generated, and
          it stays one-way (no visitor replies).
        </p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-8">
            <Composer onCreated={load} />
            <ThreadList threads={threads} onToggle={toggle} onDelete={remove} />
          </div>
        )}
      </div>
    </main>
  );
}
