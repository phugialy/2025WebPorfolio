import Link from "next/link";
import { holidayStatuses, monthDay } from "@/lib/deals-core";

// The season as one sequence: Thanksgiving, Black Friday, Cyber Monday, Christmas,
// New Year, in the order shoppers meet them. The one on now is filled with its
// color, the ones coming show when they start, and the ones over fade back.
// `active` marks the page being viewed.
export function DealsTimeline({ active, className = "" }: { active?: string; className?: string }) {
  const statuses = holidayStatuses();
  return (
    <nav aria-label="Holiday sequence" className={className}>
      <ol className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-5">
        {statuses.map(({ holiday: h, phase, label }) => {
          const on = phase === "now";
          const viewing = active === h.slug;
          return (
            <li key={h.slug} className="last:col-span-2 sm:last:col-span-1">
              <Link
                href={`/deals/${h.slug}`}
                aria-current={viewing ? "page" : undefined}
                data-holiday-phase={phase}
                className={`flex h-full flex-col rounded-xl border-2 p-3 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on ? "text-white" : "bg-card text-foreground"
                } ${phase === "ended" ? "opacity-60" : ""}`}
                style={
                  on
                    ? { background: `linear-gradient(135deg, ${h.theme.deep}, ${h.theme.accent})`, borderColor: h.theme.accent }
                    : { borderColor: viewing ? h.theme.accent : `${h.theme.accent}40`, borderTopColor: h.theme.accent, borderTopWidth: 6 }
                }
              >
                <span className={`text-xs font-semibold ${on ? "text-white/85" : "text-muted-foreground"}`}>{monthDay(h.date)}</span>
                <span className="mt-0.5 font-display text-base font-bold leading-tight">{h.name}</span>
                <span className={`mt-1 text-xs leading-snug ${on ? "text-white/85" : "text-muted-foreground"}`}>{h.niche}</span>
                <span
                  className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    on ? "bg-white text-neutral-900" : ""
                  }`}
                  style={on ? undefined : { background: h.theme.tint, color: "#1f1f1f" }}
                >
                  {on && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse" style={{ background: h.theme.accent }} />}
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
