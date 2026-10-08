import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Lightbulb } from "lucide-react";

const readerPaths = [
  {
    icon: Compass,
    label: "Understand the change",
    copy: "Plain-language context for a new capability, tool, or shift.",
  },
  {
    icon: Lightbulb,
    label: "Make a better decision",
    copy: "The tradeoffs behind buying, building, or changing a workflow.",
  },
  {
    icon: BookOpen,
    label: "Build with care",
    copy: "Practical patterns for making an AI idea usable in the real world.",
  },
];

export function SignalField() {
  return (
    <div aria-hidden="true" className="relative h-28 overflow-hidden border-y border-white/10 sm:h-36">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,rgba(247,247,245,0.12)_1px,transparent_1px),linear-gradient(180deg,rgba(247,247,245,0.1)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#FFC400]/40" />
      <div className="absolute left-[8%] top-[calc(50%-1px)] h-0.5 w-[26%] bg-[#FFC400]" />
      <div className="absolute left-[34%] top-[calc(50%-1px)] h-0.5 w-[18%] animate-pulse bg-[#FFC400]" />
      <div className="absolute left-[52%] top-[calc(50%-1px)] h-0.5 w-[14%] bg-[#FFC400]/65" />
      <div className="absolute left-[66%] top-[calc(50%-1px)] h-0.5 w-[11%] animate-pulse bg-[#FFC400]/45 [animation-delay:1.4s]" />
      <div className="absolute left-[77%] top-[calc(50%-1px)] h-0.5 w-[15%] bg-[#FFC400]/25" />
    </div>
  );
}

export function ReaderPaths() {
  return (
    <section className="bg-[#F7F7F5] px-5 py-14 text-[#08090B] sm:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#826600]">Keep exploring</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Find the note that meets you where you are.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#55575C]">A few useful routes through the publication. No need to know the right jargon first.</p>
        </div>
        <div className="mt-8 grid border-y border-[#08090B]/15 md:grid-cols-3 md:divide-x md:divide-[#08090B]/15">
          {readerPaths.map((path) => {
            const Icon = path.icon;
            return (
              <Link key={path.label} href="/ui-preview/blog" className="group border-b border-[#08090B]/15 px-0 py-6 last:border-b-0 md:border-b-0 md:px-6 md:first:pl-0">
                <Icon className="h-5 w-5 text-[#826600]" />
                <h3 className="mt-4 font-display text-2xl font-semibold group-hover:text-[#826600]">{path.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#55575C]">{path.copy}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#08090B] group-hover:text-[#826600]">Explore notes <ArrowRight className="h-4 w-4" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EditorialRhythm() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">What to expect here</p>
          <h2 className="mt-5 max-w-lg font-display text-4xl font-semibold leading-tight sm:text-5xl">A useful reading rhythm, without the noise.</h2>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {[
            ["AI, in plain terms", "A calm explanation of an idea, tool, or shift without assuming you already know the language."],
            ["Worth watching", "A short list of changes that may become practical, with a reason to care and a reason to wait."],
            ["From the field", "A direct observation from building, testing, or seeing how a workflow breaks in the real world."],
          ].map(([label, copy], index) => (
            <div key={label} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 py-5">
              <span className="font-mono text-xs text-[#FFC400]">0{index + 1}</span>
              <div><h3 className="font-display text-2xl font-semibold">{label}</h3><p className="mt-2 text-sm leading-relaxed text-[#A8ABB2]">{copy}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
