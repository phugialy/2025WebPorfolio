"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Mail,
  Newspaper,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { ArticleNewsCard } from "@/components/blog/article-news-card";
import { PartnerCarousel } from "@/components/home/partner-carousel";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { AffiliateProduct } from "@/lib/affiliate";
import type { BlogPost } from "@/lib/articles";
import { LANES } from "@/lib/lanes";

const REFRESH_INTERVAL_MS = 120_000;

const laneIcons: Record<string, typeof Bot> = {
  "ai-advancement": Bot,
  "applied-ai": Workflow,
  "how-to-ai": Sparkles,
  "vibe-coding-codex": Terminal,
  "dfw-commercial": Briefcase,
};

const laneTones = [
  "from-blue-500/18 to-cyan-500/5",
  "from-emerald-500/18 to-blue-500/5",
  "from-violet-500/18 to-blue-500/5",
  "from-amber-500/18 to-blue-500/5",
  "from-cyan-500/18 to-blue-500/5",
];

const editorialLanes = LANES.map((lane, index) => ({
  icon: laneIcons[lane.slug] || Sparkles,
  title: lane.label,
  description: lane.description,
  tone: laneTones[index % laneTones.length],
  href: `/topics/${lane.slug}`,
}));

function articleSignature(posts: BlogPost[]) {
  return posts.map((post) => `${post._id}:${post.updatedAt}:${post.slug}`).join("|");
}

function formatRefreshTime(value: Date | null) {
  if (!value) return "Syncing";
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function LiveHomeDashboard({
  initialPosts,
  partners,
}: {
  initialPosts: BlogPost[];
  partners: AffiliateProduct[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newArticleCount, setNewArticleCount] = useState(0);

  const refreshPosts = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      setIsRefreshing(true);
      const response = await fetch("/api/articles", { cache: "no-store" });
      if (!response.ok) return;

      const nextPosts = (await response.json()) as BlogPost[];
      setPosts((currentPosts) => {
        const currentSignature = articleSignature(currentPosts);
        const nextSignature = articleSignature(nextPosts);

        if (currentSignature === nextSignature) {
          return currentPosts;
        }

        const currentSlugs = new Set(currentPosts.map((post) => post.slug));
        const incomingCount = nextPosts.filter((post) => !currentSlugs.has(post.slug)).length;
        setNewArticleCount((count) => count + incomingCount);
        return nextPosts;
      });
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLastUpdated(new Date());
    const interval = window.setInterval(refreshPosts, REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      void refreshPosts();
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [refreshPosts]);

  // Daily cron-computed relevance score (recency + engagement + curation)
  // drives the homepage's curated sections so they feel alive between actual
  // publish events, rather than pure reverse-chronology. /blog stays
  // chronological on purpose -- this sort only applies here.
  const rankedPosts = useMemo(
    () => [...posts].sort((a, b) => (b.metadata?.rankScore ?? 0) - (a.metadata?.rankScore ?? 0)),
    [posts]
  );

  const featuredPosts = useMemo(() => rankedPosts.slice(0, 5), [rankedPosts]);
  const leadPost = featuredPosts[0];
  const secondaryPosts = featuredPosts.slice(1);

  return (
    <div className="text-foreground">
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1.16fr)_minmax(400px,0.84fr)] xl:py-0">
          <div className="xl:border-r xl:border-border xl:py-10 xl:pr-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.18em] text-primary"><Newspaper className="h-3.5 w-3.5" /> Live editorial desk</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {isRefreshing ? "Refreshing" : `Updated ${formatRefreshTime(lastUpdated)}`}</span></div>
            {leadPost ? <ArticleNewsCard post={leadPost} variant="lead" /> : <div className="border border-border p-8 text-muted-foreground">Preparing the latest note.</div>}
          </div>
          <aside className="border-t border-border pt-8 xl:border-t-0 xl:py-10 xl:pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Reading map</p><h1 className="mt-3 font-display text-3xl font-semibold leading-tight">What is worth following now.</h1><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Three nearby notes from the live feed, selected to keep the thread going.</p>
            <div className="mt-7 border-y border-border">{secondaryPosts.slice(0, 3).map((post, index) => <div key={post._id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border last:border-b-0"><span className="pt-5 font-mono text-xs text-primary">0{index + 2}</span><ArticleNewsCard post={post} variant="brief" /></div>)}</div>
            <Link href="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open the reading room <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </div>
      </section>

      {newArticleCount > 0 && <button onClick={() => setNewArticleCount(0)} className="mx-auto block max-w-7xl px-5 py-3 text-sm text-primary sm:px-8">{newArticleCount} new {newArticleCount === 1 ? "note is" : "notes are"} in the live feed.</button>}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Worth your attention</p><h2 className="mt-3 font-display text-4xl font-semibold">A few places to keep reading.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">The live feed refreshes in the background. These are the notes currently rising to the surface.</p></div><div className="mt-8 grid gap-5 md:grid-cols-3">{rankedPosts.slice(4, 7).map((post) => <ArticleNewsCard key={post._id} post={post} variant="home-lead" />)}</div></section>

      <section className="border-y border-border bg-card"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore by lens</p><h2 className="mt-3 font-display text-3xl font-semibold">Follow the question that brought you here.</h2></div><Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">Browse all notes <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-8 grid divide-y divide-white/10 border-y border-border md:grid-cols-5 md:divide-x md:divide-y-0">{editorialLanes.map((lane) => <Link key={lane.title} href={lane.href} className="group px-0 py-5 md:px-5 md:first:pl-0"><p className="font-display text-xl font-semibold group-hover:text-primary">{lane.title}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lane.description}</p></Link>)}</div></div></section>

      {partners.length > 0 && <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Worth a look</p><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">A recommendation appears here only when it relates to the work and reading above.</p><div className="mt-6"><PartnerCarousel partners={partners} /></div></section>}

      <section className="border-t border-border"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-20"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bring the real question</p><h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight">Have a workflow or decision that still feels unclear?</h2><p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Share the context you have. The goal is a useful next thought, not a sales pitch.</p></div><div className="self-end border-l border-primary pl-5"><TrackedLink href="/opportunity?from=homepage" eventName="commercial_cta_click" eventParams={{ source_page: "homepage", target: "opportunity_intake" }}><Button size="lg" className="w-full">Start a conversation <Mail className="h-4 w-4" /></Button></TrackedLink><Link href="/about" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">Behind the notes <ArrowRight className="h-4 w-4" /></Link></div></div></section>
    </div>
  );
}
