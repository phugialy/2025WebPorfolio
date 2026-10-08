import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, Clock3, Share2 } from "lucide-react";
import { PreviewFooter, PreviewShell } from "@/components/ui-preview/preview-shell";
import { PreviewArticlePick } from "@/components/ui-preview/article-pick";
import { getPublishedPosts } from "@/lib/articles";
import { getPicksForArticle } from "@/lib/affiliate";

export const metadata: Metadata = {
  title: "Article Preview",
  robots: { index: false, follow: false },
};

function previewDate(timestamp?: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(timestamp || Date.now())
  );
}

export default async function ArticlePreviewPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  const posts = await getPublishedPosts();
  const post = posts.find((candidate) => candidate.slug === slug) || posts[0];
  const picks = post ? await getPicksForArticle(post._id) : [];
  const lane = post?.metadata.portfolioLane || post?.tags[0] || "Practical AI";
  const hook = post?.metadata.readerHook || post?.metadata.excerpt || post?.metadata.aiSummary || "A practical note about what changes when AI enters a real workflow.";
  const takeaway = post?.metadata.readerTakeaway || post?.metadata.readerPayoff || "The useful work begins with clear ownership, review, and a visible decision trail.";
  const take = post?.metadata.phugialyTake || "The best AI work makes the next human decision clearer, not less accountable.";
  const action = post?.metadata.whatWedDo || "Start with one repeated task, define the review boundary, and learn from the result before expanding.";
  const heroImage = post?.metadata.heroImageUrl;

  return (
    <PreviewShell>
      <article>
        <header className="mx-auto max-w-5xl px-5 pb-10 pt-12 sm:px-8 lg:pb-16 lg:pt-20">
          <Link href="/ui-preview/blog" className="inline-flex items-center gap-2 text-sm text-[#A8ABB2] transition hover:text-[#FFC400]">
            <ArrowLeft className="h-4 w-4" /> All notes
          </Link>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">{lane}</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">
            {post?.title || "AI agents become useful when the work around them becomes clear."}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[#A8ABB2] sm:text-xl">
            {hook}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-4 text-sm text-[#A8ABB2]">
            <div className="flex flex-wrap items-center gap-3"><span>{previewDate(post?.publishDate || post?.createdAt)}</span><span>•</span><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {post?.metadata.readTime || 5} min read</span></div>
            <div className="flex gap-3"><button aria-label="Save note"><Bookmark className="h-4 w-4" /></button><button aria-label="Share note"><Share2 className="h-4 w-4" /></button></div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative aspect-[16/8] overflow-hidden bg-[#16181D]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={post?.title || "Article cover"} className="h-full w-full object-cover" />
            ) : (
              <Image src="/ui-preview/ai-orientation-desk-hero-v1.png" alt="A reader mapping a clear route through changing technology" fill sizes="(min-width: 1024px) 1152px, 100vw" className="object-cover" />
            )}
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[160px_minmax(0,680px)_240px] lg:py-20">
          <aside className="hidden lg:block"><p className="text-xs uppercase tracking-[0.16em] text-[#A8ABB2]">In this note</p><ol className="mt-4 grid gap-3 text-sm text-[#A8ABB2]"><li>The real bottleneck</li><li>Where review belongs</li><li>What to make visible</li></ol></aside>
          <div className="text-lg leading-[1.75] text-[#D4D5D7]">
            <p className="font-display text-3xl leading-tight text-[#F7F7F5]">{post?.metadata.readerProblem || hook}</p>
            <p className="mt-7">{post?.metadata.readerQuestion || takeaway}</p>
            <h2 className="mt-14 font-display text-4xl font-semibold leading-tight text-[#F7F7F5]">{post?.metadata.mainAngle || "The practical question."}</h2>
            <p className="mt-6">{takeaway}</p>
            <blockquote className="my-12 border-l-2 border-[#FFC400] pl-6 font-display text-3xl leading-snug text-[#F7F7F5]">“{take}”</blockquote>
            <p>{action}</p>
          </div>
          <aside className="self-start border-l-2 border-[#FFC400] bg-white/[0.035] p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC400]">Phu&apos;s take</p><p className="mt-4 font-display text-2xl leading-snug">{take}</p><Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#FFC400]">Talk through a workflow <ArrowRight className="h-4 w-4" /></Link></aside>
        </div>

        <PreviewArticlePick product={picks[0]} articleSlug={post?.slug || "article-preview"} />

        <section className="border-y border-white/10 bg-[#101114]"><div className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Keep reading</p><div className="mt-6 grid gap-6 md:grid-cols-2"><Link href="/ui-preview/article" className="group border-t border-white/10 pt-5"><p className="text-sm text-[#A8ABB2]">Workflow design</p><h2 className="mt-2 font-display text-3xl font-semibold group-hover:text-[#FFC400]">Start with the repeated task, not the tool.</h2></Link><Link href="/ui-preview/blog" className="group border-t border-white/10 pt-5"><p className="text-sm text-[#A8ABB2]">Back to the desk</p><h2 className="mt-2 font-display text-3xl font-semibold group-hover:text-[#FFC400]">More notes for real operating decisions.</h2></Link></div></div></section>
      </article>
      <PreviewFooter />
    </PreviewShell>
  );
}
