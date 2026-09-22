import Link from "next/link";
import { ArrowRight, Bot, FileText, Mail, Network, ShieldCheck, Workflow } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About",
  description:
    "About Phu Gia Ly, a practical AI, automation, and software systems builder focused on workflow design, agentic tools, and reliable implementation.",
  alternates: {
    canonical: "/about",
  },
};

const focusAreas = [
  {
    icon: Bot,
    title: "AI systems",
    description: "Practical views on agents, orchestration, model behavior, and the review layer that keeps automation useful.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description: "Turning repeated operational work into cleaner intake, reporting, handoff, and approval flows.",
  },
  {
    icon: Network,
    title: "Software systems",
    description: "Building web tools, backend flows, and publishing infrastructure that can keep improving over time.",
  },
];

const operatingPrinciples = [
  "Use AI where it improves a real workflow, not where it only sounds impressive.",
  "Keep humans in the loop for scope, review, judgment, and release decisions.",
  "Make the writing useful to a reader who has to act, decide, build, or explain.",
  "Treat automation as an operating system for work, not a one-off demo.",
];

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><FileText className="h-3.5 w-3.5" /> Behind the notes</p>
              <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">Practical AI, automation, and systems built to survive real use.</h1>
              <p className="mt-7 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">I use this publication to turn what I am noticing, testing, and questioning into practical workflow judgment that others can use.</p>
            </div>
            <aside className="self-end border-l border-primary pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Start here</p>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">Read the notes first. Then bring the real workflow, decision, or question that is still unresolved.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/blog"><Button>Read the notes <ArrowRight className="h-4 w-4" /></Button></Link><Link href="/contact"><Button variant="outline" className="border-border bg-transparent">Send context <Mail className="h-4 w-4" /></Button></Link></div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">What I work around</p>
          <div className="mt-7 grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {focusAreas.map((area) => { const Icon = area.icon; return <div key={area.title} className="px-0 py-7 md:px-7 md:first:pl-0"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-5 font-display text-2xl font-semibold">{area.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{area.description}</p></div>; })}
          </div>
        </section>

        <section className="border-y border-border bg-card"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(260px,0.6fr)_minmax(0,1.4fr)] lg:py-20"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How I think</p><h2 className="mt-5 font-display text-4xl font-semibold leading-tight">Practical, low-hype, and built around actual work.</h2><div className="mt-8 inline-flex items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 text-primary" /> Private work stays private.</div></div><div className="divide-y divide-border border-y border-border">{operatingPrinciples.map((principle, index) => <p key={principle} className="grid grid-cols-[32px_minmax(0,1fr)] gap-4 py-5 text-base leading-relaxed text-muted-foreground"><span className="font-mono text-xs text-primary">0{index + 1}</span>{principle}</p>)}</div></div></section>
      </main>
    </>
  );
}
