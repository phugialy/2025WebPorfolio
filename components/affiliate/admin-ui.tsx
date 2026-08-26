export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Buckets mirror the matcher's actual weights (lib/affiliate.ts: exact tag
// 1.0, lane 1.5, fuzzy word 0.4) so the badge means something instead of
// repeating the same "no strong signal" sentence on every card.
export function matchQuality(score: number | null): { label: string; className: string } {
  if (score === null) {
    return { label: "Manual", className: "border-primary/40 bg-primary/10 text-primary" };
  }
  if (score >= 1.5) {
    return { label: "Strong match", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" };
  }
  if (score >= 1) {
    return { label: "Tag match", className: "border-sky-500/40 bg-sky-500/10 text-sky-300" };
  }
  if (score > 0) {
    return { label: "Fuzzy match", className: "border-blue-500/40 bg-blue-500/10 text-blue-300" };
  }
  return { label: "Fallback", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" };
}

export function Thumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) {
    return <div className="h-10 w-10 flex-none rounded-md bg-white/[0.06]" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-10 w-10 flex-none rounded-md object-cover" />;
}
