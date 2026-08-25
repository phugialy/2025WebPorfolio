import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { listPublishedThreads } from "@/lib/threads";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Threads",
  description: "Short, direct notes from Phu Gia Ly -- intentions, tips, and what's actually being used and why.",
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
            <span className="text-foreground">Threads</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Threads
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              Short, unfiltered notes
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              No pipeline, no review queue. Intentions, tips, and what I&apos;m actually using right
              now, in my own words.
            </p>
          </header>

          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing posted yet.</p>
          ) : (
            <div className="grid gap-4">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/threads/${thread.id}`}
                  className="group block rounded-2xl border bg-card p-5 transition-all duration-300 hover:border-primary/50"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <time dateTime={thread.published_at || thread.created_at}>
                      {formatDate(thread.published_at || thread.created_at)}
                    </time>
                  </div>
                  {thread.title && (
                    <h2 className="font-display text-lg font-bold transition-colors group-hover:text-primary">
                      {thread.title}
                    </h2>
                  )}
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {thread.body}
                  </p>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
