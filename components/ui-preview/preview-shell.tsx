import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import { Navigation } from "@/components/navigation";

export function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main data-ui-preview className="min-h-screen bg-[#08090B] text-[#F7F7F5] selection:bg-[#FFC400] selection:text-[#2A2200]">
        <style>{`main[data-ui-preview] + footer { display: none; }`}</style>
        {children}
      </main>
    </>
  );
}

export function PreviewFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0D0E10]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(150px,0.52fr)_minmax(150px,0.52fr)_minmax(220px,0.7fr)]">
          <div>
            <Image src="/brand/phugialy-logo-full-light-on-dark.svg" alt="Phu Gia Ly" width={88} height={88} />
            <p className="mt-5 max-w-sm font-display text-2xl font-semibold leading-tight text-[#F7F7F5]">Learn what matters. Build what helps.</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A8ABB2]">Practical notes and direct support for people finding their way through AI, one useful question at a time.</p>
          </div>
          <nav aria-label="Read more">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Read</p>
            <div className="mt-5 grid gap-3 text-sm text-[#A8ABB2]">
              <Link href="/ui-preview/blog" className="transition hover:text-[#FFC400]">Latest notes</Link>
              <Link href="/ui-preview/blog" className="transition hover:text-[#FFC400]">AI advancement</Link>
              <Link href="/ui-preview/blog" className="transition hover:text-[#FFC400]">Applied AI</Link>
              <Link href="/ui-preview/blog" className="transition hover:text-[#FFC400]">Build with AI</Link>
            </div>
          </nav>
          <nav aria-label="About Phugialy">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">About</p>
            <div className="mt-5 grid gap-3 text-sm text-[#A8ABB2]">
              <Link href="/ui-preview/about" className="transition hover:text-[#FFC400]">Behind the notes</Link>
              <Link href="/disclosure" className="transition hover:text-[#FFC400]">Editorial disclosure</Link>
              <a href="https://www.linkedin.com/in/phu-gia-ly" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-[#FFC400]"><Linkedin className="h-4 w-4" /> LinkedIn</a>
              <a href="https://github.com/phugialy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-[#FFC400]"><Github className="h-4 w-4" /> GitHub</a>
            </div>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]">Bring a question</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#A8ABB2]">Have an early idea, a stuck workflow, or a practical AI question? Start with the context you have.</p>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#F7F7F5] transition hover:text-[#FFC400]">Contact Phu <Mail className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-[#A8ABB2] sm:flex-row sm:items-center sm:justify-between">
          <span>Phugialy / 2026</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>Practical AI &amp; Automation Notes</span><Link href="/disclosure" className="transition hover:text-[#FFC400]">Disclosure</Link><Link href="/contact" className="inline-flex items-center gap-1 transition hover:text-[#FFC400]">Contact <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </div>
    </footer>
  );
}
