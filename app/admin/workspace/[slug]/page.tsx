"use client";

import type React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Check,
  Eye,
  FileText,
  ImageIcon,
  MessageSquareText,
  Save,
  Sparkles,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";

type ArticleStatus =
  | "draft"
  | "new"
  | "reviewed"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

type WorkspaceArticle = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: ArticleStatus;
  ai_summary: string | null;
  notes: string | null;
  editorial_score: number | null;
  portfolio_lane: string | null;
  hero_image_url: string | null;
  image_assets?: Array<{ url: string; role: string; alt?: string }> | null;
  raw_payload?: {
    researchBrief?: {
      missingEvidence?: string[];
      evidenceDepth?: {
        requiredLevel?: string;
        sourceMinimum?: number;
        currentEvidenceScore?: number;
        canProceed?: boolean;
      };
      writerHandoff?: {
        angle?: string;
        audience?: string;
        contentMode?: string;
        readerBridge?: {
          readerPain?: string;
          whyTheyShouldCare?: string;
          practicalPayoff?: string;
        };
      };
    };
    criticReview?: {
      readinessLevel?: number;
      decision?: string;
      topFixes?: string[];
      unsupportedClaims?: string[];
      evidenceDepthNotes?: string[];
      readerConnectionNotes?: string[];
    };
    imageBrief?: {
      imageStrategy?: string;
      readerTakeaway?: string;
    };
    generation?: {
      rewritesUsed?: number;
      rewriteLimit?: number;
      retrievalLimitation?: string;
    };
  } | null;
};

type EditorResponse = {
  mode?: "answer" | "critique" | "rewrite" | "patch";
  assistantMessage?: string;
  critique?: string[];
  proposedTitle?: string;
  proposedSummary?: string;
  proposedMarkdown?: string;
  proposedNotes?: string;
  articleType?: string;
  readerEffect?: string;
  removedSections?: string[];
  patchNotes?: string[];
  audienceFit?: string;
  applyTargets?: string[];
};

type EditorMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiAction = "editor" | "image";

const audienceOptions = [
  "CFO / Executive",
  "Technical leadership",
  "Software engineer",
  "Small business operator",
  "Local commercial business",
  "Portfolio thought leadership",
];

const quickActions = [
  {
    label: "Critique",
    prompt:
      "Critique this article. Focus on audience fit, structure, weak claims, sections that do not belong, and the top fixes.",
  },
  {
    label: "CFO Rewrite",
    prompt:
      "Rewrite this for a CFO/executive audience. Remove engineer-heavy sections that do not fit, including Try this next and What I would avoid if they weaken the article. Emphasize business risk, operational impact, governance, trust, and decision framing.",
  },
  {
    label: "Executive Summary",
    prompt:
      "Rewrite the title and summary so they feel executive-level, sharper, and less like an engineering note.",
  },
  {
    label: "Tighten",
    prompt:
      "Tighten the article. Remove repetitive sections, keep the strongest argument, and make the flow easier to scan.",
  },
];

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

function ArticlePreview({
  article,
  title,
  summary,
  content,
}: {
  article: WorkspaceArticle;
  title: string;
  summary: string;
  content: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {article.hero_image_url && (
        <figure className="border-b bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.hero_image_url} alt="" className="aspect-[21/9] w-full object-cover" />
        </figure>
      )}

      <div className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            {article.status}
          </span>
          {article.portfolio_lane && <span>{article.portfolio_lane}</span>}
          {article.editorial_score !== null && <span>Score {article.editorial_score}</span>}
        </div>

        <h2 className="font-display text-3xl font-bold leading-tight text-foreground md:text-5xl">
          {title || "Untitled article"}
        </h2>

        {summary && (
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )}

        <div className="prose prose-lg mt-8 max-w-none dark:prose-invert">
          {content.split("\n").map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={index} className="h-3" />;
            if (trimmed.startsWith("# ")) return <h1 key={index}>{trimmed.slice(2)}</h1>;
            if (trimmed.startsWith("## ")) return <h2 key={index}>{trimmed.slice(3)}</h2>;
            if (trimmed.startsWith("### ")) return <h3 key={index}>{trimmed.slice(4)}</h3>;
            if (trimmed.startsWith("- ")) return <li key={index}>{renderInlineLinks(trimmed.slice(2))}</li>;
            if (/^\d+\.\s/.test(trimmed)) {
              return <li key={index}>{renderInlineLinks(trimmed.replace(/^\d+\.\s/, ""))}</li>;
            }
            return <p key={index}>{renderInlineLinks(trimmed)}</p>;
          })}
        </div>
      </div>
    </article>
  );
}

function WorkspaceContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [article, setArticle] = useState<WorkspaceArticle | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    aiSummary: "",
    notes: "",
    editorialScore: "",
  });
  const [audienceLevel, setAudienceLevel] = useState("CFO / Executive");
  const [editorPrompt, setEditorPrompt] = useState("");
  const [editorResponse, setEditorResponse] = useState<EditorResponse | null>(null);
  const [editorMessages, setEditorMessages] = useState<EditorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<AiAction | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadArticle = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load article");
      const found = (data.articles || []).find((item: WorkspaceArticle) => item.slug === slug);
      if (!found) throw new Error("Article not found");
      setArticle(found);
      setDraft({
        title: found.title,
        content: found.content || "",
        aiSummary: found.ai_summary || "",
        notes: found.notes || "",
        editorialScore: found.editorial_score?.toString() || "",
      });
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

  const saveDraft = async () => {
    if (!article) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          aiSummary: draft.aiSummary,
          notes: draft.notes,
          editorialScore: draft.editorialScore ? Number(draft.editorialScore) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save article");
      setArticle(data.article);
      setMessage("Saved article changes.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save article");
    } finally {
      setSaving(false);
    }
  };

  const runEditorAction = async (promptOverride?: string) => {
    if (!article) return;
    const prompt = promptOverride || editorPrompt;
    if (!prompt.trim()) {
      setError("Tell the editor what you want to improve or ask.");
      return;
    }

    setRunningAction("editor");
    setError("");
    setMessage("");
    setEditorMessages((current) => [...current, { role: "user" as const, content: prompt }].slice(-8));

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "editor",
          instruction: prompt,
          audienceLevel,
          currentDraft: draft,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Article editor failed");
      const editor = data.editor || {};
      setEditorResponse(editor);
      setEditorMessages((current) =>
        [
          ...current,
          { role: "assistant" as const, content: editor.assistantMessage || data.output || "" },
        ].slice(-8)
      );
      setEditorPrompt("");
      setMessage(`Article editor completed with ${data.model || "OpenRouter"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Article editor failed");
    } finally {
      setRunningAction("");
    }
  };

  const runImageAction = async () => {
    if (!article) return;
    setRunningAction("image");
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "image",
          instruction: editorPrompt || "Generate a cleaner hero image for this article.",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image generation failed");
      setMessage("Generated and attached a new article image.");
      await loadArticle();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image generation failed");
    } finally {
      setRunningAction("");
    }
  };

  const applyEditorResponse = (target: "title" | "summary" | "content" | "notes") => {
    if (!editorResponse) return;
    setDraft((current) => ({
      ...current,
      ...(target === "title" && editorResponse.proposedTitle ? { title: editorResponse.proposedTitle } : {}),
      ...(target === "summary" && editorResponse.proposedSummary
        ? { aiSummary: editorResponse.proposedSummary }
        : {}),
      ...(target === "content" && editorResponse.proposedMarkdown
        ? { content: editorResponse.proposedMarkdown }
        : {}),
      ...(target === "notes" && editorResponse.proposedNotes ? { notes: editorResponse.proposedNotes } : {}),
    }));
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <Card className="p-6 text-muted-foreground">Loading workspace...</Card>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="container mx-auto px-4 py-12">
        <Card className="p-6">
          <h1 className="font-display text-2xl font-bold">Workspace unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  const protocol = article.raw_payload || {};
  const critic = protocol.criticReview;
  const research = protocol.researchBrief;
  const evidenceDepth = research?.evidenceDepth;
  const readerBridge = research?.writerHandoff?.readerBridge;
  const imageBrief = protocol.imageBrief;
  const generation = protocol.generation;
  const hasProtocolSummary = Boolean(critic || research || imageBrief || generation);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/blog">
                <ArrowLeft className="h-4 w-4" />
                Back to Board
              </Link>
            </Button>
            <h1 className="mt-4 font-display text-3xl font-bold">Article Workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review article data, preview the draft, and use the editor agent to revise it in place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/articles/${article.slug}`}>
                <Eye className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={saveDraft} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)_390px]">
          <aside className="space-y-4 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto 2xl:pr-1">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-display text-xl font-semibold">Article Data</h2>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Title
                  <Input
                    className="mt-2"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium">
                  Summary
                  <Textarea
                    className="mt-2 min-h-[92px]"
                    value={draft.aiSummary}
                    onChange={(event) => setDraft((current) => ({ ...current, aiSummary: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium">
                  Notes
                  <Textarea
                    className="mt-2 min-h-[96px]"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium">
                  Editorial Score
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    max="10"
                    value={draft.editorialScore}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, editorialScore: event.target.value }))
                    }
                  />
                </label>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="font-display text-xl font-semibold">Markdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manual edits update the preview immediately.</p>
              <Textarea
                className="mt-3 min-h-[420px] font-mono text-xs leading-relaxed"
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              />
            </Card>

            {hasProtocolSummary && (
              <Card className="p-4">
                <h2 className="font-display text-xl font-semibold">Protocol Summary</h2>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {critic && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium text-foreground">
                        Critic: {critic.decision || "reviewed"} / readiness {critic.readinessLevel ?? "-"} of 5
                      </p>
                      {critic.topFixes?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {critic.topFixes.slice(0, 3).map((fix) => (
                            <li key={fix}>{fix}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )}
                  {evidenceDepth && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium text-foreground">
                        Evidence: {evidenceDepth.requiredLevel || "standard"} / score{" "}
                        {evidenceDepth.currentEvidenceScore ?? "-"} of 5
                      </p>
                      <p className="mt-1">
                        Minimum sources: {evidenceDepth.sourceMinimum ?? "-"} -{" "}
                        {evidenceDepth.canProceed ? "can proceed" : "needs more proof"}
                      </p>
                    </div>
                  )}
                  {readerBridge && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium text-foreground">Reader Bridge</p>
                      {readerBridge.readerPain && <p className="mt-1">{readerBridge.readerPain}</p>}
                      {readerBridge.practicalPayoff && (
                        <p className="mt-1 text-foreground/80">{readerBridge.practicalPayoff}</p>
                      )}
                    </div>
                  )}
                  {research?.missingEvidence?.length ? (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium text-foreground">Missing Evidence</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {research.missingEvidence.slice(0, 3).map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {generation && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      Rewrites used: {generation.rewritesUsed ?? 0} / {generation.rewriteLimit ?? 2}
                    </div>
                  )}
                  {imageBrief && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium text-foreground">
                        Image: {imageBrief.imageStrategy || "thumbnail"}
                      </p>
                      {imageBrief.readerTakeaway && <p className="mt-1">{imageBrief.readerTakeaway}</p>}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Live Article Preview
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Center surface for reading the draft as the audience will see it.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/articles/${article.slug}`}>
                    <Eye className="h-4 w-4" />
                    Full Preview
                  </Link>
                </Button>
              </div>
              <ArticlePreview article={article} title={draft.title} summary={draft.aiSummary} content={draft.content} />
            </div>

            {(article.hero_image_url || article.image_assets?.length) && (
              <div className="rounded-2xl border bg-card p-4">
                <h2 className="font-display text-xl font-semibold">Image Set</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(article.image_assets?.length
                    ? article.image_assets
                    : article.hero_image_url
                      ? [{ url: article.hero_image_url, role: "hero", alt: article.title }]
                      : []
                  ).map((image, index) => (
                    <figure key={`${image.url}-${index}`} className="overflow-hidden rounded-lg border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.alt || ""} className="aspect-[16/9] w-full object-cover" />
                      <figcaption className="px-3 py-2 text-xs capitalize text-muted-foreground">
                        {image.role}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto 2xl:pl-1">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="font-display text-xl font-semibold">AI Editor</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ask questions, critique the current draft, or rewrite it for a specific audience.
              </p>

              <label className="mt-4 block text-sm font-medium">
                Audience
                <select
                  className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={audienceLevel}
                  onChange={(event) => setAudienceLevel(event.target.value)}
                >
                  {audienceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runEditorAction(action.prompt)}
                    disabled={!!runningAction}
                  >
                    {action.label === "CFO Rewrite" ? (
                      <BriefcaseBusiness className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>

              <Textarea
                value={editorPrompt}
                onChange={(event) => setEditorPrompt(event.target.value)}
                placeholder="Ask the editor: rewrite this for CFO level, remove sections that feel too engineer-focused, explain why the angle is weak, improve only the intro..."
                className="mt-3 min-h-[130px]"
              />
              <div className="mt-3 grid gap-2">
                <Button onClick={() => runEditorAction()} disabled={!!runningAction || !editorPrompt.trim()}>
                  <MessageSquareText className="h-4 w-4" />
                  {runningAction === "editor" ? "Thinking..." : "Ask Editor"}
                </Button>
                <Button variant="outline" onClick={runImageAction} disabled={!!runningAction}>
                  <ImageIcon className="h-4 w-4" />
                  {runningAction === "image" ? "Generating..." : "Generate Image"}
                </Button>
              </div>
            </Card>

            {editorResponse && (
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Editor Response</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-primary">
                      {editorResponse.mode || "answer"} {editorResponse.audienceFit ? `- ${editorResponse.audienceFit}` : ""}
                    </p>
                  </div>
                  <Check className="mt-1 h-4 w-4 text-emerald-500" />
                </div>

                {(editorResponse.articleType || editorResponse.readerEffect) && (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                    {editorResponse.articleType && (
                      <p>
                        <span className="font-medium text-foreground">Type:</span>{" "}
                        {editorResponse.articleType}
                      </p>
                    )}
                    {editorResponse.readerEffect && (
                      <p className="mt-1">
                        <span className="font-medium text-foreground">Reader effect:</span>{" "}
                        {editorResponse.readerEffect}
                      </p>
                    )}
                  </div>
                )}

                {editorResponse.assistantMessage && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {editorResponse.assistantMessage}
                  </p>
                )}

                {editorResponse.critique?.length ? (
                  <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium">Critique</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {editorResponse.critique.slice(0, 5).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {editorResponse.patchNotes?.length ? (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium">Patch Notes</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {editorResponse.patchNotes.slice(0, 5).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {editorResponse.removedSections?.length ? (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium">Removed or Reworked Sections</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {editorResponse.removedSections.slice(0, 5).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2">
                  {editorResponse.proposedTitle && (
                    <Button variant="outline" size="sm" onClick={() => applyEditorResponse("title")}>
                      Apply Title
                    </Button>
                  )}
                  {editorResponse.proposedSummary && (
                    <Button variant="outline" size="sm" onClick={() => applyEditorResponse("summary")}>
                      Apply Summary
                    </Button>
                  )}
                  {editorResponse.proposedMarkdown && (
                    <Button size="sm" onClick={() => applyEditorResponse("content")}>
                      Apply Article Rewrite
                    </Button>
                  )}
                  {editorResponse.proposedNotes && (
                    <Button variant="outline" size="sm" onClick={() => applyEditorResponse("notes")}>
                      Apply Notes
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {editorMessages.length > 0 && (
              <Card className="p-4">
                <h2 className="font-display text-xl font-semibold">Editor Thread</h2>
                <div className="mt-3 space-y-2">
                  {editorMessages.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={`rounded-lg border p-3 text-sm ${
                        item.role === "user" ? "bg-primary/10 text-foreground" : "bg-muted/25 text-muted-foreground"
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                        {item.role === "user" ? "You" : "Editor"}
                      </p>
                      <p className="line-clamp-5 leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function AdminWorkspacePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <WorkspaceContent />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
