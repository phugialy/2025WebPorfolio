import Link from "next/link";
import { ArrowRight, Bot, FileText, Mail, Network, ShieldCheck, Workflow } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About",
  description: "About the builder behind Phu Gia Ly's AI and automation notes.",
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
      <main className="min-h-screen overflow-hidden bg-[#07080b] text-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(7,8,11,0) 34%), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 72px 72px, 72px 72px",
            maskImage: "linear-gradient(180deg, black 0%, black 56%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-[2rem] bg-white/[0.035] p-3 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-4 lg:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-[1.65rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 sm:p-8 lg:p-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-muted-foreground shadow-inner shadow-white/5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Behind the notes
                </div>
                <h1 className="mt-6 max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
                  I build around practical AI, automation, and systems that have to survive real use.
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  This site is centered on the writing because the writing is the product surface: what I am noticing, testing, questioning, and turning into practical workflow judgment.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Publication", "AI and automation notes"],
                    ["Default lens", "Builder plus operator"],
                    ["Best contact", "Send context first"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-black/25 p-4 shadow-inner shadow-white/5">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary">{label}</div>
                      <div className="mt-2 font-display text-xl font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-[1.65rem] bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(255,255,255,0.035))] p-5 shadow-xl shadow-black/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Start here
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
                    Read the notes first, then send the real problem.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    The best conversation usually starts from a workflow, an article, or a decision you are trying to make.
                  </p>
                  <div className="mt-5 grid gap-2">
                    <Link href="/blog">
                      <Button className="w-full">
                        Read the Notes
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="outline" className="w-full border-white/10 bg-black/20">
                        Send Context
                        <Mail className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.65rem] bg-black/20 p-5 shadow-xl shadow-black/20">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-display text-xl font-bold">Private work stays private.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Public visitors see the publication and contact paths. Project work is no longer exposed as a public section.
                  </p>
                </div>
              </aside>
            </div>

            <section className="mt-4 grid gap-4 md:grid-cols-3">
              {focusAreas.map((area) => {
                const Icon = area.icon;
                return (
                  <div key={area.title} className="rounded-[1.35rem] bg-black/20 p-5 shadow-lg shadow-black/15">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner shadow-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-xl font-bold">{area.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {area.description}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="mt-4 rounded-[1.65rem] bg-black/20 p-5 shadow-xl shadow-black/20 sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    How I think
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold leading-tight">
                    Practical, low-hype, and built around actual work.
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {operatingPrinciples.map((principle) => (
                    <div key={principle} className="rounded-2xl bg-white/[0.035] p-4 text-sm leading-relaxed text-muted-foreground shadow-inner shadow-white/5">
                      {principle}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
