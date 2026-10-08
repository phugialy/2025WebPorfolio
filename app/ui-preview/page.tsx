import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Quote,
  Sparkles,
} from "lucide-react";
import { EditorialRhythm, ReaderPaths, SignalField } from "@/components/ui-preview/orientation-desk";
import { PreviewFooter } from "@/components/ui-preview/preview-shell";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "UI Preview",
  robots: { index: false, follow: false },
};

const notes = [
  {
    lane: "Applied AI",
    title: "The useful part of AI is the workflow around it.",
    description:
      "A practical look at where orchestration, review, and clear operating boundaries matter more than another impressive demo.",
    time: "6 min read",
    number: "01",
  },
  {
    lane: "AI Advancement",
    title: "The model is only half the decision.",
    description:
      "Capability is moving quickly. The harder question is which changes actually alter a team's work.",
    time: "4 min read",
    number: "02",
  },
  {
    lane: "How-to-AI",
    title: "Start with the repeated task, not the tool.",
    description:
      "A narrower way to find automation opportunities before a workflow becomes another abandoned experiment.",
    time: "5 min read",
    number: "03",
  },
];

const capabilities = [
  ["01", "AI systems", "From use-case framing to a working system with sensible review points."],
  ["02", "Workflow design", "Clearer intake, handoffs, approvals, and the automation that connects them."],
  ["03", "Software delivery", "Web and backend systems built for the less glamorous part: reliable day-to-day use."],
];

export default function UiPreviewPage() {
  return (
    <>
      <Navigation />
      <main data-ui-preview className="min-h-screen bg-[#08090B] text-[#F7F7F5] selection:bg-[#FFC400] selection:text-[#2A2200]">
        <style>{`main[data-ui-preview] + footer { display: none; }`}</style>

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-8 lg:pb-16 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center">
          <div>
            <p className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">
              <Sparkles className="h-3.5 w-3.5" /> Practical AI &amp; Automation Notes
            </p>
            <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[0.96] sm:text-6xl lg:text-7xl">
              AI is moving fast. You do not have to feel lost inside it.
            </h1>
            <div className="mt-8 border-l border-[#FFC400] pl-5 text-base leading-relaxed text-[#A8ABB2]">
            Phugialy helps people understand what is changing, decide what matters, and explore how AI can become useful in real work.
            <a href="#latest" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#F7F7F5] hover:text-[#FFC400]">
              Read the latest <ArrowDownward />
            </a>
            </div>
          </div>

          <figure className="relative overflow-hidden border border-white/15 bg-[#15120d]">
            <div className="relative aspect-[16/10]">
              <Image
                src="/ui-preview/ai-orientation-desk-hero-v1.png"
                alt="A reader mapping a clear route through changing technology"
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="absolute bottom-0 left-0 max-w-sm bg-[#08090B]/90 px-5 py-4 text-sm leading-relaxed text-[#F7F7F5] backdrop-blur">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFC400]">The signal</span>
              Make room for the question before rushing toward the answer.
            </figcaption>
          </figure>
        </div>
      </section>

      <SignalField />

      <section id="latest" className="border-y border-white/10 bg-[#101114]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
          <article className="group border-b border-white/10 p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-12">
            <div className="relative aspect-[16/10] overflow-hidden bg-[#16181D]">
              <Image
                src="/ui-preview/ai-orientation-desk-hero-v1.png"
                alt="A reader mapping a clear route through changing technology"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover opacity-85 transition duration-700 group-hover:scale-[1.02]"
              />
              <span className="absolute left-4 top-4 rounded-full bg-[#08090B]/80 px-3 py-1 text-xs font-medium text-[#FFC400] backdrop-blur">
                Editor&apos;s note
              </span>
            </div>
            <div className="max-w-3xl pt-7">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#A8ABB2]">
                <span className="font-medium uppercase tracking-[0.14em] text-[#FFC400]">Applied AI</span>
                <span aria-hidden>•</span>
                <span>September 21, 2026</span>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> 6 min read</span>
              </div>
              <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.03] sm:text-5xl">
                AI agents become useful when the work around them becomes clear.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#A8ABB2] sm:text-lg">
                The deciding factor is rarely a better prompt. It is deciding where a task begins,
                what a person still owns, and how the result becomes safe to use.
              </p>
              <button className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#FFC400] hover:text-[#F7F7F5]">
                Read the note <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </article>

          <div className="divide-y divide-white/10">
            {notes.map((note) => (
              <article key={note.number} className="group grid grid-cols-[32px_minmax(0,1fr)] gap-4 p-6 sm:p-8">
                <span className="font-mono text-xs text-[#FFC400]">{note.number}</span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A8ABB2]">{note.lane}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold leading-tight group-hover:text-[#FFC400]">
                    {note.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#A8ABB2]">{note.description}</p>
                  <span className="mt-4 inline-block text-xs text-[#A8ABB2]">{note.time}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ReaderPaths />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">The reading experience</p>
            <h2 className="mt-5 max-w-md font-display text-4xl font-semibold leading-tight sm:text-5xl">
              The important part is the judgment, not the recap.
            </h2>
          </div>
          <div className="max-w-2xl text-base leading-relaxed text-[#A8ABB2] sm:text-lg">
            A note opens with the reader&apos;s real decision, moves through evidence, then makes space
            for a clear point of view. The author&apos;s voice is visible, but it does not interrupt the
            reading flow with another dashboard widget.
          </div>
        </div>

        <article className="mt-14 grid gap-12 border-t border-white/10 pt-10 lg:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Inside an article</p>
            <h3 className="mt-4 font-display text-4xl font-semibold leading-tight">The model is the easy part. The operating model is where it gets expensive.</h3>
            <p className="mt-6 text-lg leading-relaxed text-[#A8ABB2]">
              Teams often measure an AI initiative by what it can produce. The quieter cost is what
              happens after: who checks it, where it enters the process, and how often a human has
              to repair the work it was supposed to remove.
            </p>
            <p className="mt-5 text-base leading-relaxed text-[#A8ABB2]">
              That is why the useful implementation question is not “Which model should we buy?”
              It is “Which recurring decision should this system make easier, and what must remain
              visible when it does?”
            </p>
          </div>

          <aside className="self-start border-l-2 border-[#FFC400] bg-white/[0.035] p-6">
            <Quote className="h-6 w-6 text-[#FFC400]" />
            <p className="mt-5 font-display text-2xl leading-snug">
              “Automation earns trust when people can still see the decision it made.”
            </p>
            <p className="mt-5 text-sm leading-relaxed text-[#A8ABB2]">
              Phu&apos;s take: start with one repeatable decision, make the review boundary explicit,
              and only then expand the workflow.
            </p>
          </aside>
        </article>
      </section>

      <EditorialRhythm />

      <section className="bg-[#F7F7F5] px-5 py-20 text-[#08090B] sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-b border-[#08090B]/15 pb-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#826600]">Select engagements</p>
              <h2 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl">
                When the note points to a real problem, we can talk about the work.
              </h2>
            </div>
            <div className="text-base leading-relaxed text-[#55575C]">
              A quiet capability surface, not a project gallery. Enough context for the right
              person to start a useful conversation.
              <button className="mt-5 inline-flex items-center gap-2 font-semibold text-[#08090B] hover:text-[#826600]">
                Start a conversation <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#08090B]/15">
            {capabilities.map(([number, title, description]) => (
              <div key={number} className="grid gap-4 py-7 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.65fr)] sm:items-center">
                <span className="font-mono text-sm text-[#826600]">{number}</span>
                <h3 className="font-display text-3xl font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-[#55575C]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
        <PreviewFooter />
      </main>
    </>
  );
}

function ArrowDownward() {
  return <ArrowRight className="h-4 w-4 rotate-90" />;
}
