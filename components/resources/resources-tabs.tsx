"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AffiliateProduct } from "@/lib/affiliate";

type CategoryGroup = { category: string; items: AffiliateProduct[] };

function ResourceCard({ resource }: { resource: AffiliateProduct }) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group flex gap-4 rounded-2xl border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
    >
      {resource.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resource.image_url}
          alt={resource.name}
          className="h-16 w-16 flex-none rounded-xl bg-white object-contain p-1"
        />
      ) : (
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.28),transparent_34%),linear-gradient(135deg,rgba(18,18,18,1),rgba(38,38,38,0.9))]">
          <Tag className="h-6 w-6 text-primary/80" />
        </div>
      )}
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {resource.network === "amazon" ? "Amazon" : resource.brand || "Recommended"}
        </span>
        <h3 className="mt-1 line-clamp-2 font-display text-base font-bold leading-snug transition-colors group-hover:text-primary">
          {resource.name}
        </h3>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{resource.description}</p>
        )}
      </div>
    </Link>
  );
}

export function ResourcesTabs({ gear, reading }: { gear: CategoryGroup[]; reading: CategoryGroup[] }) {
  const [tab, setTab] = useState<"gear" | "reading">("gear");
  const gearCount = gear.reduce((n, g) => n + g.items.length, 0);
  const readingCount = reading.reduce((n, g) => n + g.items.length, 0);
  const groups = tab === "gear" ? gear : reading;

  return (
    <div>
      <div className="mb-8 inline-flex rounded-full border bg-card p-1">
        <button
          type="button"
          onClick={() => setTab("gear")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "gear" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Gear ({gearCount})
        </button>
        <button
          type="button"
          onClick={() => setTab("reading")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "reading" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Reading List ({readingCount})
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid gap-10">
          {groups.map(({ category, items }) => (
            <section key={category}>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
                <Tag className="h-4 w-4 text-primary" />
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
