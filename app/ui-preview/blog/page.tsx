import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { PreviewFooter, PreviewShell } from "@/components/ui-preview/preview-shell";
import { SignalField } from "@/components/ui-preview/orientation-desk";
import { getPublishedPosts, type BlogPost } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Notes Preview",
  robots: { index: false, follow: false },
};

const topicFilters = ["All notes", "Applied AI", "AI advancement", "Workflow design", "Building with AI"];

function articleHref(slug: string) {
  return `/ui-preview/article?slug=${encodeURIComponent(slug)}`;
}

function articleDescription(post: BlogPost) {
  return post.metadata.readerHook || post.metadata.seoDescription || post.metadata.excerpt || post.metadata.aiSummary || post.content.slice(0, 180);
}

function articleLane(post: BlogPost) {
  return post.metadata.portfolioLane || post.tags[0] || "Practical AI";
}

function articleDate(post: BlogPost) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(post.publishDate || post.createdAt)
  );
}

export default async function BlogPreviewPage() {
  const posts = await getPublishedPosts();
  const [featured, ...stories] = posts;
  return (
    <PreviewShell>
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 lg:pb-20 lg:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">The publication</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">
            An AI orientation desk for people who want a clearer next thought.
          </h1>
          <p className="border-l border-[#FFC400] pl-5 text-base leading-relaxed text-[#A8ABB2]">
            Start with curiosity. Leave with a better sense of what changed, why it matters, and where it may fit.
          </p>
        </div>
      </section>

      <SignalField />

      <section className="border-y border-white/10 bg-[#101114]">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {topicFilters.map((filter, index) => (
                <button
                  key={filter}
                  className={
                    index === 0
                      ? "whitespace-nowrap rounded-full bg-[#FFC400] px-4 py-2 text-sm font-medium text-[#2A2200]"
                      : "whitespace-nowrap rounded-full border border-white/10 px-4 py-2 text-sm text-[#A8ABB2] transition hover:border-[#FFC400] hover:text-[#F7F7F5]"
                  }
                >
                  {filter}
                </button>
              ))}
            </div>
            <label className="flex h-10 w-full items-center gap-2 border-b border-white/20 text-sm text-[#A8ABB2] lg:w-64">
              <Search className="h-4 w-4" />
              <span>Search the notes</span>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          {featured ? <article className="group">
            <div className="relative aspect-[16/9] overflow-hidden bg-[#16181D]">
              {featured.metadata.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.metadata.heroImageUrl} alt={featured.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
              ) : <Image src="/ui-preview/ai-orientation-desk-hero-v1.png" alt="A reader mapping a clear route through changing technology" fill sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.02]" />}
              <div className="absolute bottom-0 left-0 bg-[#08090B]/90 px-5 py-4 text-sm text-[#F7F7F5] backdrop-blur">
                <span className="mr-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Field image</span>
                A route through the noise, before the work begins.
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC400]">Editor&apos;s selection / {articleLane(featured)}</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
              {featured.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A8ABB2]">
              {articleDescription(featured)}
            </p>
            <Link href={articleHref(featured.slug)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#FFC400] hover:text-[#F7F7F5]">
              Read the note <ArrowRight className="h-4 w-4" />
            </Link>
          </article> : <article className="border border-dashed border-white/15 p-8 text-[#A8ABB2]">Published notes will appear here when the connected content source has articles to show.</article>}

          <aside className="border-t border-white/10 pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Start somewhere useful</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight">Follow the question, not the noise.</h2>
            <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
              {[
                ["Applied AI", "Where tools meet real operating decisions."],
                ["Workflow design", "The handoffs that make automation dependable."],
                ["Building with AI", "Engineering judgment inside AI-assisted work."],
              ].map(([title, copy]) => (
                <Link key={title} href={featured ? articleHref(featured.slug) : "/ui-preview/blog"} className="group flex items-center justify-between gap-4 py-5">
                  <div>
                    <h3 className="font-medium group-hover:text-[#FFC400]">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#A8ABB2]">{copy}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#FFC400]" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-12 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">All notes</p>
            <h2 className="mt-3 font-display text-4xl font-semibold">The latest reading</h2>
          </div>
          <p className="hidden text-sm text-[#A8ABB2] sm:block">{posts.length} notes published</p>
        </div>

        <div className="mt-10 grid gap-4 border-y border-white/10 py-6 md:grid-cols-3">
          {[
            ["AI, in plain terms", "A gentle start for ideas that seem more complicated than they need to be."],
            ["Worth watching", "A small list of shifts that may matter later, with no pressure to act today."],
            ["From the field", "What the technology looks like once it enters a real workflow."],
          ].map(([label, copy]) => (
            <div key={label} className="border-l border-[#FFC400] pl-4"><p className="font-display text-xl font-semibold">{label}</p><p className="mt-2 text-sm leading-relaxed text-[#A8ABB2]">{copy}</p></div>
          ))}
        </div>

        <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
          {stories.slice(0, 6).map((story, index) => (
            <Link
              key={story.title}
              href={articleHref(story.slug)}
              className="group grid gap-4 py-7 sm:grid-cols-[56px_minmax(0,1fr)_160px] sm:items-start sm:gap-6"
            >
              <span className="font-mono text-xs text-[#FFC400]">0{index + 1}</span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#A8ABB2]">{articleLane(story)}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight transition group-hover:text-[#FFC400] sm:text-3xl">
                  {story.title}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A8ABB2]">{articleDescription(story)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#A8ABB2] sm:justify-end">
                <Clock3 className="h-3.5 w-3.5" /> {articleDate(story)} · {story.metadata.readTime || 5} min
              </div>
            </Link>
          ))}
        </div>
      </section>
      <PreviewFooter />
    </PreviewShell>
  );
}
