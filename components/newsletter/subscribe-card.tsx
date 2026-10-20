import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import type { SubscribeSource } from "@/lib/newsletter-core";

// The card placed after the last paragraph of every article, where a reader
// who finished the piece is most likely to want the next one.
export function SubscribeCard({
  source = "end-of-article",
  className = "",
}: {
  source?: SubscribeSource;
  className?: string;
}) {
  return (
    <aside
      aria-label="Subscribe to the daily email"
      className={`rounded-2xl border border-border bg-card p-6 sm:p-7 ${className}`}
    >
      <p className="font-display text-2xl font-bold leading-snug text-foreground">
        Get the next note in your inbox.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Short notes on what changed in AI today, from Phugialy. No sales pitches.
      </p>
      <SubscribeForm source={source} variant="card" className="mt-5" />
    </aside>
  );
}
