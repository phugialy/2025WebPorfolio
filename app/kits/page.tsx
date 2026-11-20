import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { getReadyKits } from "@/lib/kits";
import { KITS } from "@/lib/kits-core";

export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Kits: 10 Products That Belong Together | Phugialy",
  description:
    "Ten-product kits that stay up all year: a DJI Osmo vlogging kit, a GTA 6 setup, a Home AI Lab and a travel kit.",
  alternates: { canonical: `${SITE}/kits` },
};

export default async function KitsPage() {
  const ready = await getReadyKits();
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-12">
        <div className="mx-auto max-w-6xl">
          <header className="max-w-3xl">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Kits</p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight md:text-5xl">Ten products that belong together</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Each kit starts with the one thing you came for and adds nine to go with it. They stay up all year; the holiday lists come and go.
            </p>
          </header>

          {ready.length > 0 ? (
            <ul className="mt-10 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2">
              {ready.map(({ kit, products }) => (
                <li key={kit.slug}>
                  <Link
                    href={`/kits/${kit.slug}`}
                    data-kit-card={kit.slug}
                    className="block h-full rounded-2xl p-6 text-white transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
                    style={{ background: `linear-gradient(135deg, ${kit.theme.deep}, ${kit.theme.accent})` }}
                  >
                    <p className="text-xs font-semibold tracking-wide text-white/80">{products.length} products</p>
                    <h2 className="mt-2 font-display text-2xl font-bold leading-snug">{kit.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/90">{kit.intro}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 text-sm text-muted-foreground">
              The first kits are being put together ({KITS.length} planned). Check back soon, or see the{" "}
              <Link href="/resources" className="underline underline-offset-2 hover:text-foreground">
                resources page
              </Link>
              .
            </p>
          )}
        </div>
      </main>
    </>
  );
}
