import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { holidayStatuses, listCategories } from "@/lib/deals-core";

// The first thing under the hub's heading: the holiday that is on now, in its
// own color, with what is in its list and a pointer to the one after it. When
// no holiday is on yet it shows the next one coming. The categories listed are
// read from the real list, so the banner never promises a kind of product the
// list does not have.
export function DealsNowBanner({ lists }: { lists: Record<string, { category: string | null }[]> }) {
  const statuses = holidayStatuses();
  const lead = statuses.find((s) => s.phase === "now") ?? statuses.find((s) => s.phase === "next");
  if (!lead) return null;
  const { holiday: h } = lead;
  const upcoming = statuses.find((s) => s.phase === "next" && s.holiday.slug !== h.slug);
  const categories = listCategories(lists[h.slug] ?? []);
  return (
    <section
      aria-label={`${h.name} picks`}
      data-holiday-banner={h.slug}
      className="overflow-hidden rounded-3xl p-6 text-white md:p-8"
      style={{ background: `linear-gradient(135deg, ${h.theme.deep}, ${h.theme.accent})` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-900">
          <span aria-hidden="true" className="h-2 w-2 rounded-full motion-safe:animate-pulse" style={{ background: h.theme.accent }} />
          {lead.label}
        </span>
        {lead.daysToDate > 0 && <span className="text-sm font-medium text-white/90">{h.name} is in {lead.daysToDate} {lead.daysToDate === 1 ? "day" : "days"}</span>}
        {lead.daysToDate === 0 && <span className="text-sm font-medium text-white/90">{h.name} is today</span>}
      </div>
      <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight md:text-4xl">{h.name}: {h.niche.toLowerCase()}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/90">{h.intent}</p>
      {categories.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold tracking-wide text-white/80">In this list</p>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {categories.map((c) => (
              <li key={c} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href={`/deals/${h.slug}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-neutral-900 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          style={{ ["--tw-ring-offset-color" as string]: h.theme.accent }}
        >
          See the {h.name} Top 10
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {upcoming && (
          <Link href={`/deals/${upcoming.holiday.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: upcoming.holiday.theme.accent }} />
            Next: {upcoming.holiday.name}. {upcoming.label}.
          </Link>
        )}
      </div>
    </section>
  );
}
