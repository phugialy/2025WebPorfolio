import Link from "next/link";
import { Tag } from "lucide-react";
import type { AffiliateProduct } from "@/lib/affiliate";
import { cn } from "@/lib/utils";

/**
 * Sits inline in the /blog feed grid, one per 5-6 articles at most (see
 * app/blog/page.tsx). Styled like an article card, not a banner, so it
 * reads as part of the site rather than an ad slot.
 */
export function ResourceFeedCard({ resource }: { resource: AffiliateProduct }) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className={cn(
        "group grid gap-0 overflow-hidden rounded-2xl border border-primary/40 bg-primary/[0.03] transition-all duration-300 hover:border-primary/70 md:grid-cols-[220px_minmax(0,1fr)]"
      )}
    >
      <div className="flex aspect-[16/9] items-center justify-center bg-primary/10 md:aspect-auto md:min-h-[190px]">
        {resource.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.image_url}
            alt={resource.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Tag className="h-10 w-10 text-primary/80" />
        )}
      </div>
      <div className="p-5">
        <span className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          Recommended resource
        </span>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight transition-colors group-hover:text-primary">
          {resource.name}
        </h3>
        {resource.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            {resource.description}
          </p>
        )}
      </div>
    </Link>
  );
}
