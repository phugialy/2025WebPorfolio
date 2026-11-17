import type { Metadata } from "next";
import Link from "next/link";
import { NotFoundRedirect } from "@/components/not-found-redirect";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Every missing page on the site. The status stays 404 (so search engines drop
// the address); visitors are taken to the homepage after a moment.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">That page isn&apos;t here</h1>
      <p className="mt-3 text-muted-foreground">It may have moved or been taken down. Taking you to the homepage&hellip;</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href="/" className="font-semibold underline underline-offset-4">
          Go to the homepage now
        </Link>
        <Link href="/blog" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Browse the articles
        </Link>
      </div>
      <NotFoundRedirect />
    </main>
  );
}
