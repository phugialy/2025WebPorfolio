import Link from "next/link";
import { ArrowRight, Clock, FileText, Sparkles } from "lucide-react";
import { BlogPost } from "@/lib/articles";
import { LANES, inferPortfolioLane, type PortfolioLane } from "@/lib/lanes";
import { cn, formatDate } from "@/lib/utils";

type ArticleNewsCardVariant = "lead" | "brief" | "feed" | "home-lead" | "home-compact";

const laneStyles: Record<string, string> = Object.fromEntries(
  LANES.map((lane) => [lane.value, lane.style])
);

export function getArticleLane(post: BlogPost): PortfolioLane {
  return inferPortfolioLane(post.metadata?.portfolioLane, post.tags, post.title);
}

function getThumbnail(post: BlogPost) {
  return post.metadata?.heroImageUrl || post.metadata?.imageAssets?.[0]?.url || "";
}

function getThumbnailAlt(post: BlogPost) {
  return (
    post.metadata?.imageAssets?.[0]?.alt ||
    post.metadata?.imagePrompts?.[0]?.alt ||
    post.title
  );
}

function ArticleThumbnail({
  post,
  className,
}: {
  post: BlogPost;
  className?: string;
}) {
  const thumbnail = getThumbnail(post);

  if (thumbnail) {
    return (
      <div className={cn("overflow-hidden bg-muted", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={getThumbnailAlt(post)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.28),transparent_34%),linear-gradient(135deg,rgba(18,18,18,1),rgba(38,38,38,0.9))]",
        className
      )}
    >
      <FileText className="h-10 w-10 text-primary/80" />
    </div>
  );
}

function MetaRow({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <time dateTime={new Date(post.createdAt).toISOString()}>
        {formatDate(new Date(post.createdAt).toISOString())}
      </time>
      {post.metadata?.readTime && (
        <>
          <span aria-hidden="true">/</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.metadata.readTime} min{compact ? "" : " read"}
          </span>
        </>
      )}
    </div>
  );
}

function LanePill({ lane }: { lane: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        laneStyles[lane] || "border-primary/30 bg-primary/10 text-primary"
      )}
    >
      {lane}
    </span>
  );
}

function InfoSnippet({ post }: { post: BlogPost }) {
  const info = post.metadata?.infoCards?.[0];
  const takeaway = post.metadata?.readerTakeaway || post.metadata?.readerPayoff;
  if (!info && !takeaway) return null;

  return (
    <div className="mt-4 rounded-lg border bg-background/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        <Sparkles className="h-3 w-3" />
        {info?.label || "Reader takeaway"}
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {takeaway || `${info?.title}: ${info?.body}`}
      </p>
    </div>
  );
}

export function ArticleNewsCard({
  post,
  variant = "feed",
  className,
}: {
  post: BlogPost;
  variant?: ArticleNewsCardVariant;
  className?: string;
}) {
  const lane = getArticleLane(post);
  const teaser = post.metadata?.readerHook || post.metadata?.seoDescription || post.metadata?.aiSummary;

  if (variant === "lead") {
    return (
      <Link href={`/blog/${post.slug}`} className={cn("group block h-full", className)}>
        <article className="grid min-h-[440px] overflow-hidden border border-border bg-card transition-all duration-500 hover:border-primary/70 lg:grid-cols-[1.08fr_0.92fr] lg:min-h-[500px]">
          <div className="relative min-h-[300px] overflow-hidden lg:min-h-full">
            <ArticleThumbnail post={post} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Featured note</span>
              <div className="mt-1"><MetaRow post={post} /></div>
            </div>
          </div>
          <div className="flex flex-col justify-between p-6 md:p-8 lg:p-10">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <LanePill lane={lane} />
              </div>
              <h2 className="font-display text-4xl font-semibold leading-[1.02] transition-colors group-hover:text-primary md:text-5xl">
                {post.title}
              </h2>
              {teaser && (
                <p className="mt-6 line-clamp-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                  {teaser}
                </p>
              )}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Read the featured note
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "brief" || variant === "home-compact") {
    const isBrief = variant === "brief";
    return (
      <Link href={`/blog/${post.slug}`} className={cn("group block", className)}>
        <article className={isBrief ? "grid min-h-[112px] grid-cols-[92px_minmax(0,1fr)] overflow-hidden border-b border-border transition-all duration-300 hover:bg-card" : "grid min-h-[128px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-primary/50 hover:bg-muted/20"}>
          <ArticleThumbnail post={post} className={isBrief ? "h-full min-h-[112px]" : "h-full min-h-[128px]"} />
          <div className={isBrief ? "p-3.5" : "p-4"}>
            <LanePill lane={lane} />
            <h3 className="mt-3 line-clamp-2 font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
              {post.title}
            </h3>
            <div className="mt-2">
              <MetaRow post={post} compact />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "home-lead") {
    return (
      <Link href={`/blog/${post.slug}`} className={cn("group block h-full", className)}>
        <article className="h-full overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
          <ArticleThumbnail post={post} className="aspect-[16/9]" />
          <div className="p-5">
            <LanePill lane={lane} />
            <h3 className="mt-4 line-clamp-2 font-display text-2xl font-bold transition-colors group-hover:text-primary">
              {post.title}
            </h3>
            {teaser && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {teaser}
              </p>
            )}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className={cn("group block", className)}>
      <article className="grid gap-0 overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/50 hover:bg-muted/20 md:grid-cols-[220px_minmax(0,1fr)]">
        <ArticleThumbnail post={post} className="aspect-[16/9] md:aspect-auto md:min-h-[190px]" />
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <LanePill lane={lane} />
            <MetaRow post={post} />
          </div>
          <h3 className="font-display text-2xl font-bold leading-tight transition-colors group-hover:text-primary">
            {post.title}
          </h3>
          {teaser && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              {teaser}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {tag}
              </span>
            ))}
          </div>
          <InfoSnippet post={post} />
        </div>
      </article>
    </Link>
  );
}
