import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { listPublishedThreads } from "@/lib/threads";
import { formatDate } from "@/lib/utils";
import { stripMarkdownForTeaser } from "@/lib/mdx-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Field Notes",
  description: "Short, ongoing observations from Phu Gia Ly -- what's changing, what's being tried, what's actually being used and why.",
};

export default async function ThreadsPage() {
  const threads = await listPublishedThreads();

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,0.5fr)] lg:py-20">
            <header>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><MessageSquare className="h-3.5 w-3.5" /> Field Notes</p>
              <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl">
                What I&apos;m seeing while the work is still moving.
              </h1>
            </header>
            <p className="self-end border-l border-primary pl-5 text-base leading-relaxed text-muted-foreground">
              Short observations from the field: what is changing, what is being tested, and what is proving useful before it becomes a polished article.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="mb-8 flex items-center justify-between gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ongoing observations</p>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">Read full notes <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {threads.length === 0 ? (
            <p className="border-y border-border py-8 text-sm text-muted-foreground">Nothing posted yet.</p>
          ) : (
            <div className="divide-y divide-white/10 border-y border-border">
              {threads.map((thread, index) => (
                <TrackedLink
                  key={thread.id}
                  href={`/threads/${thread.id}`}
                  eventName="field_note_click"
                  eventParams={{
                    thread_id: thread.id,
                    article_id: thread.articles.map((a) => a.id).join(",") || "",
                  }}
                  className="group grid gap-4 py-7 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-6"
                >
                  <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground"><span>Field note</span><span className="text-primary">{formatDate(thread.published_at || thread.created_at)}</span></div>
                    {thread.title && <h2 className="mt-3 font-display text-2xl font-semibold leading-tight transition group-hover:text-primary sm:text-3xl">{thread.title}</h2>}
                    <p className="mt-3 line-clamp-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{stripMarkdownForTeaser(thread.body)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {thread.tags.map((tag) => <span key={tag} className="border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{tag}</span>)}
                      {thread.articles.length > 0 && <span className="text-xs text-primary">In conversation with: {thread.articles.map((article) => article.title).join(", ")}</span>}
                    </div>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 text-primary transition-transform group-hover:translate-x-1 sm:block" />
                </TrackedLink>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
