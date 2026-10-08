import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { getAmbitPartner } from "@/lib/ambit";
import {
  AMBIT_CONSULTANT_NAME,
  AMBIT_DISCLAIMER_SHORT,
  AMBIT_DISCLAIMER_URL,
  AMBIT_REP_LINE,
} from "@/lib/ambit-brand";

// The Ambit section only appears while the vendor is active, so this can't be
// statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How Phugialy handles affiliate links and commercial relationships.",
};

export default async function DisclosurePage() {
  const ambit = await getAmbitPartner();
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

          {ambit && (
            <section id="ambit" className="mt-12 scroll-mt-24 border-t border-border pt-8">
              <h2 className="font-display text-2xl font-semibold leading-tight">
                Ambit Energy
              </h2>
              <div className="mt-4 grid gap-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  {AMBIT_CONSULTANT_NAME} is an Independent Consultant for Ambit Energy
                  ({AMBIT_REP_LINE}). Independent Consultants are independent representatives of
                  Ambit Energy and do not represent your utility or any government agency.
                </p>
                <p>
                  Ambit Energy is a partner placement, not a Phugialy Pick. It appears on articles
                  about home energy, household costs, and personal finance by a standing rule, not
                  because an article&apos;s research singled it out. Phugialy may be compensated if
                  you enroll through {AMBIT_CONSULTANT_NAME}&apos;s Ambit page, at no extra cost
                  to you. Plans and availability vary by address.
                </p>
                <p>
                  {AMBIT_DISCLAIMER_SHORT}{" "}
                  <a
                    href={AMBIT_DISCLAIMER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Full Ambit disclaimer
                  </a>
                  .
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
