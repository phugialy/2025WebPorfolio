"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Rail } from "@/components/rails/rail";
import { ArticleThumbnail } from "@/components/blog/article-news-card";
import type { BlogPost } from "@/lib/articles";
import { postTime, type BlogRow } from "@/lib/blog-rows";
import { formatDate } from "@/lib/utils";

// A small article card for the rows: picture, two-line title, date and read time.
function RailCard({ post, rowId }: { post: BlogPost; rowId: string }) {
  const published = postTime(post);
  return (
    <Link href={`/blog/${post.slug}`} data-row={rowId} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50">
        <ArticleThumbnail post={post} className="aspect-[16/9] w-full" />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h4 className="line-clamp-3 font-display text-sm font-semibold leading-snug transition-colors group-hover:text-primary">{post.title}</h4>
          <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* The publish date, which is what the rows are chosen by. */}
            <time dateTime={new Date(published).toISOString()}>{formatDate(new Date(published).toISOString())}</time>
            {post.metadata?.readTime ? (
              <>
                <span aria-hidden="true">/</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {post.metadata.readTime} min
                </span>
              </>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

// The blog index as rows, like a streaming home screen. The page decides what
// goes in each row (lib/blog-rows.ts); this only draws them.
export function BlogRows({ rows, onSeeAll }: { rows: BlogRow<BlogPost>[]; onSeeAll: (themeId: string) => void }) {
  return (
    <div className="flex flex-col gap-10">
      {rows.map((row) => (
        <Rail
          key={row.id}
          title={row.title}
          blurb={row.blurb}
          itemClassName="w-[13rem] sm:w-[15rem]"
          action={
            row.themeId ? (
              <button
                type="button"
                onClick={() => onSeeAll(row.themeId as string)}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                See all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only"> {row.title}</span>
              </button>
            ) : null
          }
        >
          {row.posts.map((post) => (
            <RailCard key={post._id} post={post} rowId={row.id} />
          ))}
        </Rail>
      ))}

      <Link
        href="/deals"
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div>
          <p className="font-display text-lg font-bold">Holiday buying guides</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Top 10 picks for the season, refreshed daily.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          View Deals
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}
