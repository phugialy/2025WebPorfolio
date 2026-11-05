import Link from "next/link";

// Shown near the top of every Deals page, next to the links it covers. Plain
// words, no "affiliate link" jargon on its own.
export function DealsDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground ${className}`}>
      We earn from qualifying purchases made through these links, at no extra cost to you, as an Amazon
      Associate and through other affiliate programs. It doesn&apos;t change what we list. Prices and availability
      change often, so check the current price on the store&apos;s page before you buy.{" "}
      <Link href="/disclosure" className="underline underline-offset-2 hover:text-foreground">
        Full disclosure
      </Link>
      .
    </p>
  );
}
