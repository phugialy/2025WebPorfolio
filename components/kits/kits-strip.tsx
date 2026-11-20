import Link from "next/link";
import { getReadyKits } from "@/lib/kits";
import type { Kit } from "@/lib/kits-core";

type ReadyKit = { kit: Kit; productCount: number };

// The row of kit cards. Plain markup (no database) so it can be tested.
export function KitsStripView({ kits, heading = "Build a kit" }: { kits: ReadyKit[]; heading?: string }) {
  if (kits.length === 0) return null;
  return (
    <section aria-labelledby="kits-strip" data-kits-strip className="mt-14">
      <h2 id="kits-strip" className="font-display text-xl font-bold">
        {heading}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">Ten products that belong together. They stay up after the holidays.</p>
      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {kits.map(({ kit, productCount }) => (
          <li key={kit.slug}>
            <Link
              href={`/kits/${kit.slug}`}
              data-kit-card={kit.slug}
              className="block h-full rounded-2xl p-5 text-white transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
              style={{ background: `linear-gradient(135deg, ${kit.theme.deep}, ${kit.theme.accent})` }}
            >
              <p className="text-xs font-semibold tracking-wide text-white/80">{productCount} products</p>
              <p className="mt-1 font-display text-lg font-bold leading-snug">{kit.name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Reads the kits that are ready; renders nothing when none are, or when the read fails.
export async function KitsStrip({ heading }: { heading?: string }) {
  try {
    const ready = await getReadyKits();
    return <KitsStripView kits={ready.map(({ kit, products }) => ({ kit, productCount: products.length }))} heading={heading} />;
  } catch (error) {
    console.error("Kits strip skipped:", error);
    return null;
  }
}
