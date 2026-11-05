import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { isDealsActive } from "@/lib/deals-core";

// A slim strip near the top of the homepage that points to /deals. Renders
// nothing outside the season, so it removes itself when the section ends.
export function DealsStrip() {
  if (!isDealsActive()) return null;
  return (
    <div className="border-b border-border bg-primary/10">
      <Link
        href="/deals"
        className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-foreground transition hover:text-primary sm:px-8"
      >
        <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>Holiday Deals: top picks and offers, updated daily</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
