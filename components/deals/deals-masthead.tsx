import Link from "next/link";
import { Tag } from "lucide-react";
import { HOLIDAYS, daysUntil } from "@/lib/deals-core";

// The Deals section's own masthead: a standalone look, not the article header.
// `active` highlights the holiday page being viewed.
export function DealsMasthead({ active }: { active?: string }) {
  return (
    <div className="border-b border-border bg-[linear-gradient(135deg,rgba(255,196,0,0.18),rgba(255,196,0,0.04)_55%,transparent)]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Link href="/deals" className="group inline-flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-2xl font-black uppercase leading-none tracking-wide text-foreground group-hover:text-primary">
                Deals
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Holiday 2026
              </span>
            </span>
          </Link>
          <nav aria-label="Holiday guides" className="flex flex-wrap gap-2">
            {HOLIDAYS.map((h) => {
              const days = daysUntil(h.date);
              return (
                <Link
                  key={h.slug}
                  href={`/deals/${h.slug}`}
                  aria-current={active === h.slug ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition ${
                    active === h.slug
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/60"
                  }`}
                >
                  {h.name}
                  {days >= 0 && days <= 45 && (
                    <span className="text-xs opacity-70">{days === 0 ? "today" : `${days}d`}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
