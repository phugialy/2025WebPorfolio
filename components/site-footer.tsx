"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react";

const hiddenPrefixes = ["/admin", "/work", "/login"];

export function SiteFooter() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(150px,0.5fr)_minmax(150px,0.5fr)_minmax(220px,0.7fr)]">
          <div>
            <Link href="/" className="group inline-flex w-fit flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/phugialy-logo-full-light-on-dark.svg"
              alt="Phu Gia Ly"
              className="h-20 w-20 object-contain"
            />
            </Link>
            <h2 className="mt-5 max-w-sm font-display text-2xl font-semibold leading-tight">Learn what matters. Build what helps.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Practical notes and direct support for people finding their way through AI, one useful question at a time.</p>
          </div>

          <nav aria-label="Read more">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Read</p>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground"><Link href="/blog" className="transition hover:text-primary">Latest notes</Link><Link href="/threads" className="transition hover:text-primary">Field notes</Link><Link href="/resources" className="transition hover:text-primary">Resources</Link></div>
          </nav>

          <nav aria-label="About Phugialy">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About</p>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground"><Link href="/about" className="transition hover:text-primary">Behind the notes</Link><Link href="/disclosure" className="transition hover:text-primary">Editorial disclosure</Link><a href="https://www.linkedin.com/in/phu-gia-ly" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-primary"><Linkedin className="h-4 w-4" /> LinkedIn</a><a href="https://github.com/phugialy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-primary"><Github className="h-4 w-4" /> GitHub</a></div>
          </nav>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bring a question</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Have an early idea, a stuck workflow, or a practical AI question? Start with the context you have.</p>
            <Link href="/contact" className="mt-3 inline-flex items-center justify-between bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-background">
              Start a conversation
              <Mail className="h-4 w-4" />
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground transition hover:text-primary">Read latest notes <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Phu Gia Ly / 2026</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>Practical AI &amp; Automation Notes</span><Link href="/disclosure" className="transition hover:text-primary">Disclosure</Link><Link href="/contact" className="inline-flex items-center gap-1 transition hover:text-primary">Contact <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </div>
    </footer>
  );
}
