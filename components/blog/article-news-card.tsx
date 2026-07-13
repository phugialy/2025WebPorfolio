import Link from "next/link";
import { ArrowRight, Clock, FileText, Sparkles } from "lucide-react";
import { BlogPost } from "@/lib/articles";
import { cn, formatDate } from "@/lib/utils";

type ArticleNewsCardVariant = "lead" | "brief" | "feed" | "home-lead" | "home-compact";

const laneStyles: Record<string, string> = {
  "AI Advancement": "border-blue-500/40 bg-blue-500/10 text-blue-300",
  "Applied AI": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  "How-to-AI": "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  "Vibe-coding / Codex": "border-violet-500/40 bg-violet-500/10 text-violet-300",
  "DFW Commercial Projects + Sales": "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

export function getArticleLane(post: BlogPost) {
  if (post.metadata?.portfolioLane) return post.metadata.portfolioLane;

  const tagText = (post.tags || []).join(" ").toLowerCase();
  const titleText = post.title.toLowerCase();
  const combined = `${tagText} ${titleText}`;

  if (combined.includes("dfw") || combined.includes("sales") || combined.includes("commercial")) {
    return "DFW Commercial Projects + Sales";
  }
  if (combined.includes("codex") || combined.includes("vibe") || combined.includes("agent")) {
    return "Vibe-coding / Codex";
  }
  if (combined.includes("how") || combined.includes("guide") || combined.includes("workflow")) {
    return "How-to-AI";
  }
  if (combined.includes("automation") || combined.includes("applied")) {
    return "Applied AI";
  }

  return "AI Advancement";
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
        <article className="grid h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
          <ArticleThumbnail post={post} className="min-h-[220px] lg:min-h-full" />
          <div className="flex flex-col justify-between p-5 md:p-7">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <LanePill lane={lane} />
                <MetaRow post={post} />
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight transition-colors group-hover:text-primary md:text-4xl">
                {post.title}
              </h2>
              {teaser && (
                <p className="mt-5 line-clamp-3 text-base leading-relaxed text-muted-foreground md:text-lg">
                  {teaser}
                </p>
              )}
              <InfoSnippet post={post} />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 font-medium text-primary">
              Read the paper
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "brief" || variant === "home-compact") {
    return (
      <Link href={`/blog/${post.slug}`} className={cn("group block", className)}>
        <article className="grid min-h-[128px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-primary/50 hover:bg-muted/20">
          <ArticleThumbnail post={post} className="h-full min-h-[128px]" />
          <div className="p-4">
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
