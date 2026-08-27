import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How Phugialy handles affiliate links and commercial relationships.",
};

export default function DisclosurePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-2xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Disclosure</span>
          </nav>

          <h1 className="font-display text-4xl font-bold leading-tight">Affiliate Disclosure</h1>

          <div className="mt-6 grid gap-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Some links on this site, labeled Phugialy Picks, are affiliate links, including
              through the Amazon Associates Program. If you click one and buy something, Phugialy
              may earn a commission at no extra cost to you.
            </p>
            <p>
              A recommendation exists because the article&apos;s research pointed to a real
              decision worth making, not because an affiliate relationship exists. The commission
              does not change what gets recommended, and a product being available for commission
              is never the reason it&apos;s mentioned.
            </p>
            <p>
              Every Phugialy Pick is reviewed and approved by a human before it goes live on any
              article — nothing is added automatically.
            </p>
            <p>
              As an Amazon Associate, Phugialy earns from qualifying purchases. Product prices and
              availability are accurate as of the date indicated on each page and are subject to
              change.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
