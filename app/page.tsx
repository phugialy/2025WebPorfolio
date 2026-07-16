import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  Mail,
  Newspaper,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { getAllPosts } from "@/lib/articles";
import { ArticleNewsCard } from "@/components/blog/article-news-card";

const editorialLanes = [
  {
    icon: Bot,
    title: "AI systems",
    description: "Practical opinions on agents, orchestration, model behavior, and the human review layer.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description: "Notes on turning repeated work into cleaner processes, tools, and operating routines.",
  },
  {
    icon: Sparkles,
    title: "Builder perspective",
    description: "What I would test, avoid, ship, or question when new tools move from hype into real use.",
  },
];

const emailHref =
  "mailto:phu.lyg@gmail.com?subject=Conversation%20from%20PhuGiaLy.com&body=Hi%20Phu%2C%0A%0AI%20read%20your%20notes%20and%20wanted%20to%20talk%20about...";

export default async function HomePage() {
  const posts = await getAllPosts();
  const featuredPosts = posts.slice(0, 5);
  const leadPost = featuredPosts[0];
  const secondaryPosts = featuredPosts.slice(1);
  const feedLeadPost = secondaryPosts[0];
  const feedRestPosts = secondaryPosts.slice(1);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(10,10,10,0)_62%)]">
          <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Newspaper className="h-3.5 w-3.5 text-primary" />
                  Practical AI & Automation Notes
                </div>
                <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
                  Read practical AI views before you turn tools into workflow.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  A working publication on AI systems, automation decisions, and software workflows. The goal is simple: make the useful parts easier to understand, test, and apply.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/blog">
                    <Button size="lg" className="w-full sm:w-auto">
                      Read Latest Notes
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href={emailHref}>
                    <Button variant="outline" size="lg" className="w-full bg-background/80 sm:w-auto">
                      Start Conversation
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                </div>

                <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-card/65 p-3">
                    <div className="font-display text-2xl font-bold">{posts.length}</div>
                    <div className="text-xs text-muted-foreground">published notes</div>
                  </div>
                  <div className="rounded-xl border bg-card/65 p-3">
                    <div className="font-display text-2xl font-bold">5</div>
                    <div className="text-xs text-muted-foreground">topic lanes</div>
                  </div>
                  <div className="rounded-xl border bg-card/65 p-3">
                    <div className="font-display text-2xl font-bold">
                      {posts.filter((post) => post.metadata?.heroImageUrl).length}
                    </div>
                    <div className="text-xs text-muted-foreground">visual briefs</div>
                  </div>
                </div>
              </div>

              {leadPost ? (
                <ArticleNewsCard post={leadPost} variant="home-lead" />
              ) : (
                <div className="rounded-2xl border bg-card p-6">
                  <FileText className="h-8 w-8 text-primary" />
                  <h2 className="mt-4 font-display text-2xl font-bold">Notes are loading</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    New AI and automation writing will appear here as the publishing system runs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {secondaryPosts.length > 0 && (
          <section className="border-b bg-muted/15">
            <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-primary">
                      <FileText className="h-4 w-4" />
                      Latest from the publishing system
                    </div>
                    <h2 className="font-display text-3xl font-bold">Current AI & automation reads</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Recent notes are written to pull a topic out of the news cycle and into practical judgment: what matters, what to test, and where the limits are.
                    </p>
                  </div>
                  <Link href="/blog">
                    <Button variant="outline" size="sm">
                      Browse All Notes
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                  {feedLeadPost && <ArticleNewsCard post={feedLeadPost} variant="lead" />}
                  {feedRestPosts.length > 0 && (
                    <div className="grid content-start gap-4">
                      {feedRestPosts.map((post) => (
                        <ArticleNewsCard key={post._id} post={post} variant="home-compact" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-3">
              {editorialLanes.map((lane) => {
                const Icon = lane.icon;
                return (
                  <Link
                    key={lane.title}
                    href="/blog"
                    className="group rounded-2xl border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/20"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold transition-colors group-hover:text-primary">
                      {lane.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {lane.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Explore notes
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="container mx-auto px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
              <div className="rounded-2xl border bg-card p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                  Want to talk through a workflow?
                </p>
                <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight md:text-4xl">
                  If a note connects to a real problem you are working on, send me the context.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  The fastest path is email: what you are trying to build, what feels manual, and where AI or automation might help. I will read it and respond from there.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a href={emailHref}>
                    <Button size="lg" className="w-full sm:w-auto">
                      Email Me First
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                  <Link href="/about">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      About the Person Behind It
                      <UserRound className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/25 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                  Behind the scenes
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold">A publishing system, not a static homepage.</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The notes are generated, reviewed, enriched with metadata, and published through the same system this site uses. If you are curious about the builder, the About page can carry that story next.
                </p>
                <Link href="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Go to About
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
