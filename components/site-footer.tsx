"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";

const hiddenPrefixes = ["/admin", "/work", "/login"];

export function SiteFooter() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <footer className="bg-[#08090B] px-4 pb-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1fr)_260px] lg:items-end">
          <Link href="/" className="group inline-flex w-fit flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/phugialy-logo-full-light-on-dark.svg"
              alt="Phu Gia Ly"
              className="h-28 w-28 object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Practical AI / Automation / Systems
            </span>
          </Link>

          <div>
            <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight md:text-4xl">
              Practical notes for teams turning AI into useful software workflows.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Field-tested writing on agentic systems, automation design, backend workflows, and the human review layer that keeps new tools reliable.
            </p>
          </div>

          <div className="grid gap-2">
            <Link
              href="/contact"
              className="inline-flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Start conversation
              <Mail className="h-4 w-4" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            >
              Read latest notes
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-muted-foreground">
          <span>Phu Gia Ly. Practical AI & Automation Notes.</span>
          <span>phugialy.com</span>
        </div>
      </div>
    </footer>
  );
}
