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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const editorialLanes = [
  {
    icon: Bot,
    title: "AI systems",
    description: "Agents, orchestration, model behavior, and the human review layer.",
    tone: "from-blue-500/18 to-cyan-500/5",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description: "Cleaner processes, operating routines, and practical software handoffs.",
    tone: "from-emerald-500/18 to-blue-500/5",
  },
  {
    icon: Sparkles,
    title: "Builder perspective",
    description: "What I would test, avoid, ship, or question when tools move past hype.",
    tone: "from-violet-500/18 to-blue-500/5",
  },
];

export default async function HomePage() {
  const posts = await getAllPosts();
  const featuredPosts = posts.slice(0, 5);
  const leadPost = featuredPosts[0];
  const secondaryPosts = featuredPosts.slice(1);
  const feedLeadPost = secondaryPosts[0];
  const feedRestPosts = secondaryPosts.slice(1);
  const visualCount = posts.filter((post) => post.metadata?.heroImageUrl).length;

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-[#07080b] text-foreground">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(7,8,11,0) 30%), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 72px 72px, 72px 72px",
              maskImage: "linear-gradient(180deg, black 0%, black 46%, transparent 100%)",
            }}
          />

          <div className="relative mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="rounded-[2rem] bg-white/[0.035] p-3 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-4 lg:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-4">
                  <div className="rounded-[1.55rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-5 sm:p-7 lg:p-8">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
                      <div>
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-muted-foreground shadow-inner shadow-white/5">
                        <Newspaper className="h-3.5 w-3.5 text-primary" />
                        Practical AI & Automation Notes
                      </div>
                      <h1 className="max-w-5xl font-display text-4xl font-bold leading-tight md:text-6xl">
                        Read practical AI views before tools become workflow.
                      </h1>
                      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                        A working publication on AI systems, automation decisions, and software workflows. Start with the newest note, follow a lane, or send a question when a topic connects to a real problem.
                      </p>
                      </div>

                      <div>
                        <div className="grid gap-3">
                          <Link href="/blog">
                            <Button size="lg" className="w-full">
                              Read Latest Notes
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href="/contact">
                            <Button variant="outline" size="lg" className="w-full border-white/10 bg-black/25">
                              Start Conversation
                              <Mail className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-2 sm:grid-cols-3 sm:gap-3">
                        {[
                          [posts.length, "published notes"],
                          [5, "topic lanes"],
                          [visualCount, "visual briefs"],
                        ].map(([value, label]) => (
                          <div key={label} className="rounded-2xl bg-black/25 p-3 shadow-inner shadow-white/5">
                            <div className="font-display text-2xl font-bold">{value}</div>
                            <div className="text-xs text-muted-foreground">{label}</div>
                          </div>
                        ))}
                      </div>
                  </div>

                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
                    <div className="min-w-0 self-start rounded-[1.55rem] bg-black/20 p-4 shadow-xl shadow-black/20">
                      {leadPost ? (
                        <ArticleNewsCard
                          post={leadPost}
                          variant="home-lead"
                          className="[&_article]:border-transparent [&_article]:bg-white/[0.035] [&_article]:shadow-none"
                        />
                      ) : (
                        <div className="rounded-[1.55rem] bg-card/80 p-6 shadow-inner shadow-white/5">
                          <FileText className="h-8 w-8 text-primary" />
                          <h2 className="mt-4 font-display text-2xl font-bold">Notes are loading</h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            New AI and automation writing will appear here as the publishing system runs.
                          </p>
                        </div>
                      )}
                    </div>

                    {secondaryPosts.length > 0 && (
                      <div className="rounded-[1.55rem] bg-black/20 p-4 shadow-xl shadow-black/20 sm:p-5">
                        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                          <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-primary">
                              <FileText className="h-4 w-4" />
                              Latest from the publishing system
                            </div>
                            <h2 className="font-display text-3xl font-bold">Current AI & automation reads</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                              Recent notes move a topic from the news cycle into practical judgment.
                            </p>
                          </div>
                          <Link href="/blog">
                            <Button variant="outline" size="sm" className="border-white/10 bg-black/20">
                              Browse All Notes
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        <div className="grid content-start gap-4">
                          {feedLeadPost && (
                            <ArticleNewsCard
                              post={feedLeadPost}
                              variant="home-compact"
                              className="[&_article]:border-white/10 [&_article]:bg-white/[0.035]"
                            />
                          )}
                          {feedRestPosts.map((post) => (
                            <ArticleNewsCard
                              key={post._id}
                              post={post}
                              variant="home-compact"
                              className="[&_article]:border-white/10 [&_article]:bg-white/[0.035]"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {editorialLanes.map((lane) => {
                      const Icon = lane.icon;
                      return (
                        <Link
                          key={lane.title}
                          href="/blog"
                          className={cn(
                            "group rounded-[1.35rem] bg-gradient-to-br p-5 shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:shadow-primary/10",
                            lane.tone
                          )}
                        >
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-primary shadow-inner shadow-white/10">
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

                <aside className="grid gap-4 xl:sticky xl:top-24 xl:self-start">
                  <div className="rounded-[1.55rem] bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(255,255,255,0.035))] p-5 shadow-xl shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      Start here
                    </p>
                    <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
                      Choose a path into the notes.
                    </h2>
                    <div className="mt-5 grid gap-2">
                      {["AI systems", "Workflow automation", "Builder perspective"].map((item) => (
                        <Link
                          key={item}
                          href="/blog"
                          className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-3 text-sm text-muted-foreground shadow-inner shadow-white/5 transition hover:text-foreground hover:bg-primary/10"
                        >
                          {item}
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.55rem] bg-card/75 p-5 shadow-xl shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      Talk through a workflow
                    </p>
                    <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
                      If a note hits a real problem, send me the context.
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Email what you are trying to build, what feels manual, and where AI or automation might help.
                    </p>
                    <div className="mt-5 grid gap-2">
                      <Link href="/contact">
                        <Button className="w-full">
                          Email Me First
                          <Mail className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/about">
                        <Button variant="outline" className="w-full border-white/10 bg-black/20">
                          About the Person Behind It
                          <UserRound className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[1.55rem] bg-black/20 p-5 shadow-xl shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      Behind the scenes
                    </p>
                    <h3 className="mt-3 font-display text-xl font-bold">A publishing system, not a static homepage.</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Notes are generated, reviewed, enriched with metadata, and published through the same system this site uses.
                    </p>
                    <Link href="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Go to About
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
