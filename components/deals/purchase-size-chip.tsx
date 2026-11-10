import { PURCHASE_SIZE_LABEL, type PurchaseSize } from "@/lib/deals-size";

// "Small add-on", "Mid-size buy" or "Big purchase": three dots filled to match,
// then the words. The dots are decoration; the words carry the meaning, so the
// label reads the same without color or sight. No dollar signs on purpose (see
// lib/deals-size.ts). Safe in server and client components.
export function PurchaseSizeChip({ size, compact = false }: { size: PurchaseSize; compact?: boolean }) {
  const label = PURCHASE_SIZE_LABEL[size];
  return (
    <span
      data-deals-size-label={size}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border text-muted-foreground ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]"
      } font-semibold`}
    >
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= label.dots ? "bg-foreground/75" : "bg-foreground/20"}`} />
        ))}
      </span>
      {label.text}
    </span>
  );
}
