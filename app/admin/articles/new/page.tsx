"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, FileImage, LinkIcon, Loader2, Plus, Sparkles, Square, X } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SessionProvider } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConvexClientProvider } from "@/lib/convex-provider";

type IntakeImage = {
  name: string;
  url?: string;
  kind: "file" | "url";
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function NewArticleIntake() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [idea, setIdea] = useState("");
  const [notes, setNotes] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [imageDirection, setImageDirection] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<IntakeImage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Tell me the rough article idea. I will shape it into the intake fields for the research, writer, and image agents.",
    },
  ]);
  const [shaping, setShaping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const locked = shaping || submitting;

  const canSubmit = useMemo(
    () => idea.trim().length > 0 || urls.some((url) => url.trim().length > 0),
    [idea, urls]
  );

  const addUrl = () => {
    setUrls((current) => [...current, ""]);
  };

  const updateUrl = (index: number, value: string) => {
    setUrls((current) => current.map((url, currentIndex) => (currentIndex === index ? value : url)));
  };

  const removeUrl = (index: number) => {
    setUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const addImageUrl = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    let name = trimmed;
    try {
      name = new URL(trimmed).hostname.replace("www.", "");
    } catch {
      name = "image reference";
    }
    setImages((current) => [
      ...current.slice(0, 2),
      { name, url: trimmed, kind: "url" },
    ]);
    setImageUrl("");
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 3 - images.length);
    if (!files.length) return;

    setImages((current) => [
      ...current,
      ...files.map((file) => ({ name: file.name, kind: "file" as const })),
    ].slice(0, 3));
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const shapeIdea = async () => {
    const prompt = chatInput.trim();
    if (!prompt || shaping) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: prompt }];
    setChatMessages(nextMessages);
    setChatInput("");
    setShaping(true);
    setError("");
    setMessage("Strategist is shaping the intake brief...");

    try {
      const response = await fetch("/api/admin/articles/shape-idea", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          messages: chatMessages,
          current: {
            idea,
            notes,
            urls: urls.map((url) => url.trim()).filter(Boolean),
            imageDirection,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to shape idea");

      const fields = data.fields || {};
      if (fields.idea) setIdea(fields.idea);
      if (fields.notes || fields.sourcePlanMarkdown) {
        setNotes(
          [fields.notes, fields.sourcePlanMarkdown ? `\n\n## Source Plan\n${fields.sourcePlanMarkdown}` : ""]
            .filter(Boolean)
            .join("")
        );
      }
      if (Array.isArray(fields.urls) && fields.urls.length) {
        setUrls(fields.urls.slice(0, 5));
      }
      if (fields.imageDirection) setImageDirection(fields.imageDirection);

      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.assistantMessage || "I shaped the intake fields for the other agents.",
        },
      ]);
      setMessage("Strategist filled the intake. Review it, then generate the draft.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setChatMessages((current) => [
          ...current,
          { role: "assistant", content: "Stopped. The intake fields were left unchanged." },
        ]);
        setMessage("");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to shape idea");
        setMessage("");
      }
    } finally {
      setShaping(false);
      abortRef.current = null;
    }
  };

  const stopShaping = () => {
    abortRef.current?.abort();
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("Researching sources, drafting the paper, and generating a thumbnail...");

    try {
      const response = await fetch("/api/admin/articles/create-from-idea", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idea,
          notes,
          imageDirection,
          urls: urls.map((url) => url.trim()).filter(Boolean),
          images: images.map((image) => ({
            name: image.name,
            url: image.url,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create article");

      setMessage("Draft created. Opening workspace...");
      router.push(data.workspaceUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create article");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/blog">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Board
                </Link>
              </Button>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                Idea Intake
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold">Start a New Article</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Drop in the idea, useful links, or image references. The workflow will create a draft, generate a thumbnail, and open the article workspace for review.
              </p>
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="p-5 md:p-6">
              <label className="text-sm font-medium">
                Article idea
                <Textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  disabled={locked}
                  placeholder="Example: Write about how AI agents could help small commercial contractors organize bid follow-ups, document intake, and weekly reporting without removing human review."
                  className="mt-2 min-h-[220px] text-base leading-relaxed"
                />
              </label>

              <label className="mt-5 block text-sm font-medium">
                Direction for the AI
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={locked}
                  placeholder="Optional: audience, tone, local angle, Codex angle, what to avoid, what practical example to include..."
                  className="mt-2 min-h-[120px]"
                />
              </label>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Source URLs</p>
                    <p className="text-xs text-muted-foreground">Add links the research pass should use as source context.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addUrl} disabled={locked || urls.length >= 5}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="grid gap-2">
                  {urls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={url}
                          onChange={(event) => updateUrl(index, event.target.value)}
                          disabled={locked}
                          placeholder="https://..."
                          className="pl-10"
                        />
                      </div>
                      {urls.length > 1 && (
                        <Button type="button" variant="outline" size="icon" onClick={() => removeUrl(index)} disabled={locked}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <aside className="space-y-4">
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-xl font-semibold">AI Strategist</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Chat first. The strategist fills the intake fields so the research, writer, and image agents have clearer direction.
                </p>

                <div className="mt-4 max-h-[260px] space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                  {chatMessages.map((chat, index) => (
                    <div
                      key={`${chat.role}-${index}`}
                      className={chat.role === "user" ? "text-right" : "text-left"}
                    >
                      <div
                        className={
                          chat.role === "user"
                            ? "ml-auto inline-block max-w-[90%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                            : "inline-block max-w-[90%] rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground"
                        }
                      >
                        {chat.content}
                      </div>
                    </div>
                  ))}
                </div>

                <Textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  disabled={shaping || submitting}
                  placeholder="Rough idea, audience, trend, business problem, or angle to shape..."
                  className="mt-4 min-h-[105px]"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={shapeIdea} disabled={!chatInput.trim() || shaping || submitting}>
                    {shaping ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Shaping...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Shape Idea
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={stopShaping} disabled={!shaping}>
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Image References</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Add up to 3 image references. The first workflow uses these as creative context while generating a fresh article thumbnail.
                </p>

                <label className="mt-4 block">
                  <span className="text-sm font-medium">Upload images</span>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    disabled={locked || images.length >= 3}
                    className="mt-2"
                  />
                </label>

                <div className="mt-4 flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="Image URL"
                    disabled={locked || images.length >= 3}
                  />
                  <Button type="button" variant="outline" onClick={addImageUrl} disabled={locked || images.length >= 3 || !imageUrl.trim()}>
                    Add
                  </Button>
                </div>

                <label className="mt-4 block text-sm font-medium">
                  Image direction
                  <Textarea
                    value={imageDirection}
                    onChange={(event) => setImageDirection(event.target.value)}
                    disabled={locked}
                    placeholder="Visual metaphor, thumbnail direction, inside-paper visual ideas, and what to avoid..."
                    className="mt-2 min-h-[110px]"
                  />
                </label>

                {images.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {images.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{image.name}</p>
                          <p className="text-xs text-muted-foreground">{image.kind}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)} disabled={locked}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Workflow</h2>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Read your idea and links.</p>
                  <p>2. Build a practical article brief.</p>
                  <p>3. Write a draft with portfolio guardrails.</p>
                  <p>4. Generate a main thumbnail.</p>
                  <p>5. Open the new article workspace.</p>
                </div>

                <Button className="mt-5 w-full" size="lg" onClick={submit} disabled={!canSubmit || locked}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Draft
                    </>
                  )}
                </Button>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function NewArticlePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <NewArticleIntake />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
