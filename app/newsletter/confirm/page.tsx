import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { newsletter } from "@/lib/newsletter";
import type { ConfirmResult } from "@/lib/newsletter-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your subscription",
  robots: { index: false, follow: false },
};

const COPY: Record<ConfirmResult | "error", { heading: string; body: string; retry: boolean }> = {
  confirmed: {
    heading: "You're in.",
    body: "Thanks for confirming. Your first daily email arrives soon, and a short welcome note is already on its way. You can unsubscribe at the bottom of any email.",
    retry: false,
  },
  already: {
    heading: "You're already confirmed.",
    body: "This address is already on the list. Nothing more to do.",
    retry: false,
  },
  expired: {
    heading: "That link has expired.",
    body: "Confirmation links last a week. Enter your email below and we'll send a fresh one.",
    retry: true,
  },
  invalid: {
    heading: "That link isn't valid.",
    body: "It may have been used already or copied incompletely. Enter your email below and we'll send a fresh one.",
    retry: true,
  },
  error: {
    heading: "Something went wrong.",
    body: "We couldn't confirm your subscription just now. Please try the link again in a minute.",
    retry: false,
  },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let result: ConfirmResult | "error";
  try {
    result = await newsletter.confirm(token);
  } catch (error) {
    console.error("Newsletter confirm error:", error);
    result = "error";
  }
  const copy = COPY[result];

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-14 text-foreground">
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-4xl font-bold leading-tight">{copy.heading}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.body}</p>
          {copy.retry && <SubscribeForm source="footer" variant="card" className="mt-6" />}
          <Link href="/blog" className="mt-8 inline-flex text-sm font-medium text-primary hover:underline">
            Read the latest notes
          </Link>
        </div>
      </main>
    </>
  );
}
