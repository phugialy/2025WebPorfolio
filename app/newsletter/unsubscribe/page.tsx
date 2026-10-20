import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { newsletter } from "@/lib/newsletter";
import type { UnsubscribeResult } from "@/lib/newsletter-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

// One page visit completes the opt-out: no login, no extra questions.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let result: UnsubscribeResult | "error";
  try {
    result = await newsletter.unsubscribe(token);
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    result = "error";
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-14 text-foreground">
        <div className="mx-auto max-w-xl">
          {result === "unsubscribed" ? (
            <>
              <h1 className="font-display text-4xl font-bold leading-tight">You&apos;ve been unsubscribed.</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                You won&apos;t get more emails from us. Changed your mind? Subscribe again below.
              </p>
              <SubscribeForm source="unsubscribe-page" variant="card" className="mt-6" />
            </>
          ) : result === "invalid" ? (
            <>
              <h1 className="font-display text-4xl font-bold leading-tight">That link isn&apos;t valid.</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Use the Unsubscribe link at the bottom of a recent email, or reply to any email and we&apos;ll
                remove you by hand.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl font-bold leading-tight">Something went wrong.</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                We couldn&apos;t process that just now. Please try the link again in a minute, or reply to any
                email and we&apos;ll remove you by hand.
              </p>
            </>
          )}
          <Link href="/blog" className="mt-8 inline-flex text-sm font-medium text-primary hover:underline">
            Read the latest notes
          </Link>
        </div>
      </main>
    </>
  );
}
