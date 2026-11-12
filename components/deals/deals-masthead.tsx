import Link from "next/link";
import { Tag } from "lucide-react";
import { holidayStatuses } from "@/lib/deals-core";

// The Deals section's own masthead: a standalone look, not the article header.
// It takes the color of the holiday being viewed (or the one on now), and its
// chips follow the season in order, each with its own color and state.
// `active` highlights the holiday page being viewed.
export function DealsMasthead({ active }: { active?: string }) {
  const statuses = holidayStatuses();
  const lead = statuses.find((s) => s.holiday.slug === active) ?? statuses.find((s) => s.phase === "now") ?? statuses.find((s) => s.phase === "next");
  const wash = lead?.holiday.theme.accent ?? "#FFC400";
  return (
    <div className="border-b border-border" style={{ background: `linear-gradient(135deg, ${wash}30, ${wash}0D 55%, transparent)` }}>
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
            {statuses.map(({ holiday: h, phase, short }) => {
              const viewing = active === h.slug;
              return (
                <Link
                  key={h.slug}
                  href={`/deals/${h.slug}`}
                  aria-current={viewing ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition hover:-translate-y-px ${
                    viewing ? "text-white" : "bg-background text-foreground"
                  } ${phase === "ended" ? "opacity-60" : ""}`}
                  style={viewing ? { background: h.theme.accent, borderColor: h.theme.accent } : { borderColor: `${h.theme.accent}80` }}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${phase === "now" ? "motion-safe:animate-pulse" : ""}`}
                    style={{ background: viewing ? "#fff" : h.theme.accent }}
                  />
                  {h.name}
                  {short && <span className="text-xs opacity-80">{short}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
