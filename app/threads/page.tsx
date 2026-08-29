import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
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
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-2xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Field Notes</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Field Notes
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              What I&apos;m seeing, as it happens
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              No pipeline, no review queue, no replies. Short, ongoing observations -- lighter
              and more immediate than an article.
            </p>
          </header>

          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing posted yet.</p>
          ) : (
            <div className="grid gap-4">
              {threads.map((thread) => (
                <TrackedLink
                  key={thread.id}
                  href={`/threads/${thread.id}`}
                  eventName="field_note_click"
                  eventParams={{
                    thread_id: thread.id,
                    article_id: thread.articles.map((a) => a.id).join(",") || "",
                  }}
                  className="group block rounded-2xl border bg-card p-4 transition-all duration-300 hover:border-primary/50"
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                    <MessageSquare className="h-3 w-3" />
                    Field Note
                    <span className="font-normal normal-case text-muted-foreground">
                      · {formatDate(thread.published_at || thread.created_at)}
                    </span>
                  </div>
                  {thread.title && (
                    <h2 className="font-display text-base font-bold transition-colors group-hover:text-primary">
                      {thread.title}
                    </h2>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {stripMarkdownForTeaser(thread.body)}
                  </p>
                  {thread.articles.length > 0 && (
                    <p className="mt-2 text-xs text-primary">
                      Related: {thread.articles.map((a) => a.title).join(", ")} →
                    </p>
                  )}
                  {thread.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {thread.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </TrackedLink>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
