import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Phugialy collects when you subscribe to the daily email, why, and how to remove it.",
};

const CONTACT = "phu@phugialy.com";

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-14">
        <div className="mx-auto max-w-2xl">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Privacy</span>
          </nav>

          <h1 className="font-display text-4xl font-bold leading-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: October 20, 2026</p>

          <div className="mt-6 grid gap-8 text-base leading-relaxed text-muted-foreground">
            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Who we are</h2>
              <p className="mt-2">
                Phugialy (phugialy.com) is operated by Phu Gia Ly. Questions about this policy or your data:{" "}
                <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${CONTACT}`}>
                  {CONTACT}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">
                What we collect when you subscribe
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Your email address.</li>
                <li>The page you signed up on and the campaign link you arrived from, if any.</li>
                <li>The date and time you subscribed and the date and time you confirmed.</li>
              </ul>
              <p className="mt-2">We do not ask for your name or any other personal details.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Why we collect it</h2>
              <p className="mt-2">
                To send you the daily email you asked for, and to see which pages and campaigns bring in
                subscribers. We do not sell your information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Our legal basis (EU and UK)</h2>
              <p className="mt-2">
                Your consent, which you give by confirming your subscription through the link we email you. You
                can withdraw it at any time by unsubscribing.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Who handles your data</h2>
              <p className="mt-2">
                We use service providers to run the site and send email: Resend (sending email), Supabase (our
                database) and Vercel (hosting). They process your data only to provide those services for us.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">How long we keep it</h2>
              <p className="mt-2">
                Until you unsubscribe. After that we keep your address on a do-not-email list so we never add it
                again by mistake. Ask us and we will delete it completely.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Your choices and rights</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Unsubscribe at any time with one click, using the link at the bottom of every email.</li>
                <li>
                  Ask to see, correct or delete your data by emailing{" "}
                  <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${CONTACT}`}>
                    {CONTACT}
                  </a>
                  .
                </li>
                <li>
                  If you are in the EU or UK, you can complain to your local data protection regulator. If you
                  are in California, you may have additional rights, and you can contact us to use them.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Analytics and cookies</h2>
              <p className="mt-2">
                This site uses Google Analytics to count visits and see which pages are read. Google may set
                cookies for this. You can block cookies in your browser settings or use a browser extension that
                blocks analytics.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Children</h2>
              <p className="mt-2">
                The daily email is not meant for children under 16, and we do not knowingly collect their
                information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">Changes</h2>
              <p className="mt-2">
                If we change this policy we will update the date above. For affiliate links and sponsored
                placements, see our{" "}
                <Link href="/disclosure" className="underline underline-offset-2 hover:text-foreground">
                  disclosure
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
