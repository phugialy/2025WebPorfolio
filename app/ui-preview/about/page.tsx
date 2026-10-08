import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PreviewFooter, PreviewShell } from "@/components/ui-preview/preview-shell";

export const metadata: Metadata = { title: "About Preview", robots: { index: false, follow: false } };

const capabilities = [
  ["01", "AI systems", "Framing a useful use case, putting review where it belongs, and turning an idea into an operating workflow."],
  ["02", "Workflow automation", "Finding the repeated work, defining the handoff, and making the process easier to run and inspect."],
  ["03", "Software systems", "Building the web and backend surface that keeps an operational improvement useful after the launch moment."],
];

export default function AboutPreviewPage() {
  return (
    <PreviewShell>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:pb-28 lg:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Behind the notes</p>
        <div className="mt-7 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">I write about practical AI because I build around practical work.</h1>
          <p className="border-l border-[#FFC400] pl-5 text-base leading-relaxed text-[#A8ABB2]">The writing is the public surface. Behind it is work in systems, operations, automation, and the questions that appear when a new tool has to earn a place in a real process.</p>
        </div>
      </section>

      <section className="bg-[#F7F7F5] px-5 py-20 text-[#08090B] sm:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="grid gap-8 border-b border-[#08090B]/15 pb-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#826600]">Select engagements</p><h2 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl">The shape of the work is clear. The details start with a conversation.</h2></div><p className="text-base leading-relaxed text-[#55575C]">No generic packages and no public client details. Just a focused way to find out whether there is a real problem worth solving together.</p></div><div className="divide-y divide-[#08090B]/15">{capabilities.map(([number, title, description]) => <div key={number} className="grid gap-4 py-8 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.7fr)] sm:items-center"><span className="font-mono text-sm text-[#826600]">{number}</span><h3 className="font-display text-3xl font-semibold">{title}</h3><p className="text-sm leading-relaxed text-[#55575C]">{description}</p></div>)}</div><Link href="/contact" className="mt-12 inline-flex items-center gap-2 rounded-full bg-[#08090B] px-5 py-3 text-sm font-semibold text-[#F7F7F5] transition hover:bg-[#2A2200]">Start a conversation <ArrowRight className="h-4 w-4 text-[#FFC400]" /></Link></div></section>
      <PreviewFooter />
    </PreviewShell>
  );
}
