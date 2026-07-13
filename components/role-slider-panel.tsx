"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    role: "Commercial Sales Partner",
    layer: "Commercial sales",
    headline: "Sales and lead generation support for commercial contractors.",
    description:
      "Independent contractor support for prospecting, lead qualification, follow-up coordination, and local outreach so commercial teams can maintain a cleaner opportunity pipeline.",
    accent: "amber",
    className: "border-amber-500/40 bg-amber-500/10",
    dotClassName: "bg-amber-500",
    proofTitle: "Build a cleaner commercial pipeline",
    points: [
      "Prospect list and outreach support",
      "Lead qualification and follow-up cadence",
      "Simple reporting for opportunity tracking",
    ],
    actions: [
      {
        label: "Send Email",
        href: "mailto:contact@phugialy.com?subject=Commercial%20sales%20and%20lead%20generation",
        variant: "default" as const,
        icon: Mail,
      },
      {
        label: "Schedule Services",
        href: "/schedule?service=commercial-sales",
        variant: "outline" as const,
        icon: CalendarDays,
      },
    ],
  },
  {
    role: "Applied AI Specialist",
    layer: "AI systems",
    headline: "Practical AI workflows with design, orchestration, and review gates.",
    description:
      "I help turn AI ideas into usable workflows: training materials, single-purpose assistants, and agentic processes with clear boundaries and operational documentation.",
    accent: "violet",
    className: "border-violet-500/40 bg-violet-500/10",
    dotClassName: "bg-violet-500",
    proofTitle: "Move from AI idea to operating workflow",
    points: [
      "Use-case discovery and workflow design",
      "Prompt, material, and process documentation",
      "Single-agent or multi-step agentic workflows",
    ],
    actions: [
      {
        label: "Discuss AI Use Case",
        href: "/schedule?service=applied-ai",
        variant: "default" as const,
        icon: CalendarDays,
      },
      {
        label: "Read AI Notes",
        href: "/blog",
        variant: "outline" as const,
      },
    ],
  },
  {
    role: "Automation Workflow Specialist",
    layer: "Workflow automation",
    headline: "Automation workflow engineering for business and technical operations.",
    description:
      "I design practical automations for intake, reporting, approvals, coordination, and handoffs across both IT and non-IT processes.",
    accent: "blue",
    className: "border-blue-500/40 bg-blue-500/10",
    dotClassName: "bg-blue-500",
    proofTitle: "Find the repeated work worth automating",
    points: [
      "Intake, reporting, and approval flows",
      "IT and business-process automation",
      "Human review kept inside the process",
    ],
    actions: [
      {
        label: "Map a Workflow",
        href: "/schedule?service=automation-workflow",
        variant: "default" as const,
        icon: CalendarDays,
      },
      {
        label: "View Work",
        href: "/work",
        variant: "outline" as const,
      },
    ],
  },
  {
    role: "Operations Manager",
    layer: "Operations leadership",
    headline: "Operations experience across manufacturing, warehousing, and IT deployment.",
    description:
      "I bring end-to-end operations context from assembly environments, warehouse coordination, and large corporate IT application deployment processes.",
    accent: "emerald",
    className: "border-emerald-500/40 bg-emerald-500/10",
    dotClassName: "bg-emerald-500",
    proofTitle: "Operational context behind the systems",
    points: [
      "Manufacturing and assembly coordination",
      "Warehouse and inventory workflows",
      "Corporate IT application deployment",
    ],
    actions: [
      {
        label: "Talk Operations",
        href: "/schedule?service=operations",
        variant: "default" as const,
        icon: CalendarDays,
      },
      {
        label: "View Background",
        href: "/about",
        variant: "outline" as const,
      },
    ],
  },
];

export function RoleSliderPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6200);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const goPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length);
  };

  return (
    <section
      className="mx-auto max-w-7xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card/85 shadow-sm backdrop-blur transition-colors duration-300",
          activeSlide.className
        )}
      >
        <div className="grid min-h-[560px] gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="flex min-w-0 flex-col justify-between p-6 md:p-8 lg:p-10">
            <div>
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-[11px] text-foreground">
                      {activeIndex + 1}
                    </span>
                    <span>{activeSlide.layer}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{activeSlide.role}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goPrevious}
                    aria-label="Previous role"
                    className="h-9 w-9 rounded-full bg-background/80 text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goNext}
                    aria-label="Next role"
                    className="h-9 w-9 rounded-full bg-background/80 text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                {activeSlide.headline}
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {activeSlide.description}
              </p>
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Recommended action
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {activeSlide.actions.map((action) => {
                  const Icon = action.icon;
                  const button = (
                    <Button
                      variant={action.variant}
                      size="lg"
                      className={cn(
                        "w-full sm:w-auto",
                        action.variant === "outline" && "bg-background/80 text-foreground"
                      )}
                    >
                      {action.label}
                      {Icon && <Icon className="h-4 w-4" />}
                    </Button>
                  );

                  if (action.href.startsWith("mailto:")) {
                    return (
                      <a key={action.label} href={action.href}>
                        {button}
                      </a>
                    );
                  }

                  return (
                    <Link key={action.label} href={action.href}>
                      {button}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t bg-background/45 p-6 md:p-8 lg:border-l lg:border-t-0 lg:p-9">
            <div className="flex h-full flex-col justify-between gap-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Engagement path
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">
                  {activeSlide.proofTitle}
                </h2>

                <div className="mt-6 grid gap-3">
                  {activeSlide.points.map((point) => (
                    <div key={point} className="flex items-start gap-3 rounded-lg bg-card/80 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.role}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Show ${slide.role}`}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          activeIndex === index
                            ? `w-9 ${slide.dotClassName}`
                            : "w-2 bg-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsPaused((current) => !current)}
                    aria-label={isPaused ? "Resume role slider" : "Pause role slider"}
                    className="h-8 w-8 rounded-full bg-background/80"
                  >
                    {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
