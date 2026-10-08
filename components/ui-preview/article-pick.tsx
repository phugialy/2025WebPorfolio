import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import type { ApprovedArticleProduct } from "@/lib/affiliate";

/**
 * Mirrors the production article route: this only appears when the catalog
 * returns an approved, active match for the current article.
 */
export function PreviewArticlePick({ product, articleSlug }: { product?: ApprovedArticleProduct; articleSlug: string }) {
  if (!product) return null;

  const fitNote = product.context_note || product.description || "A considered resource for this note.";
  const destination = `/api/affiliate/go/${product.id}?ref=${encodeURIComponent(articleSlug)}`;

  return (
    <aside className="mx-auto my-12 max-w-3xl border-l-2 border-[#FFC400] bg-white/[0.035] px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC400]"><Sparkles className="h-3.5 w-3.5" /> Worth a look</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#A8ABB2]"><ShieldCheck className="h-3.5 w-3.5 text-[#FFC400]" /> Reviewed for fit</span>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-[64px_minmax(0,1fr)]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-16 w-16 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center bg-[#F7F7F5] font-display text-3xl font-semibold text-[#08090B]">{product.name.slice(0, 1)}</div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#A8ABB2]">{product.brand || product.network} / {product.category || "Resource"}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{product.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A8ABB2]">{fitNote}</p>
        </div>
      </div>
      {(product.buy_if || product.skip_if) && (
        <div className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm leading-relaxed sm:grid-cols-2">
          {product.buy_if && <p><span className="font-medium text-[#F7F7F5]">Consider it if:</span> {product.buy_if}</p>}
          {product.skip_if && <p><span className="font-medium text-[#F7F7F5]">Skip it if:</span> {product.skip_if}</p>}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <a href={destination} target="_blank" rel="sponsored noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFC400] transition hover:text-[#F7F7F5]">See why it fits <ArrowUpRight className="h-4 w-4" /></a>
        <Link href="/disclosure" className="text-xs text-[#A8ABB2] underline-offset-4 hover:text-[#F7F7F5] hover:underline">Affiliate disclosure</Link>
      </div>
    </aside>
  );
}
