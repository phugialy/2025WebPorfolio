"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { normalizeEmail, type SubscribeSource } from "@/lib/newsletter-core";
import { SUBSCRIBED_EVENT, SUBSCRIBED_KEY, captureUtm, readUtm } from "@/components/newsletter/attribution";

type Variant = "bar" | "card" | "footer";
type State = "idle" | "submitting" | "success" | "error";

const ERROR_COPY: Record<string, string> = {
  invalid_email: "That doesn't look like an email address. Check it and try again.",
  send_failed: "We couldn't send the confirmation email just now. Please try again in a minute.",
  default: "Something went wrong. Please try again in a minute.",
};

// The one signup form every placement uses. Email only, no account.
export function SubscribeForm({
  source,
  variant,
  className = "",
}: {
  source: SubscribeSource;
  variant: Variant;
  className?: string;
}) {
  const inputId = useId();
  const messageId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    captureUtm();
  }, []);

  useEffect(() => {
    if (state === "success") successRef.current?.focus();
  }, [state]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    const form = new FormData(event.currentTarget);
    const clean = normalizeEmail(email);
    if (!clean) {
      setError(ERROR_COPY.invalid_email);
      setState("error");
      return;
    }

    setError(null);
    setState("submitting");
    const utm = readUtm();
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clean,
          website: form.get("website") || "",
          source,
          slug: window.location.pathname,
          utmSource: utm.utm_source,
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(ERROR_COPY[body.error ?? ""] ?? ERROR_COPY.default);
        setState("error");
        return;
      }
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
      } catch {
        // Storage blocked: the bar may reappear, which is harmless.
      }
      window.dispatchEvent(new Event(SUBSCRIBED_EVENT));
      setState("success");
    } catch {
      setError(ERROR_COPY.default);
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className={className} role="status" aria-live="polite">
        <p
          ref={successRef}
          tabIndex={-1}
          className="text-sm font-medium text-foreground outline-none"
        >
          Almost done. Check your inbox for an email from phu@phugialy.com and click the button to
          confirm. If it doesn&apos;t arrive in a few minutes, check your spam folder.
        </p>
      </div>
    );
  }

  const compact = variant === "bar";

  return (
    <form onSubmit={onSubmit} noValidate className={className} aria-label="Subscribe to the daily email">
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "error") setState("idle");
          }}
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? messageId : undefined}
          disabled={state === "submitting"}
          className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          defaultValue=""
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="min-h-11 shrink-0 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {state === "submitting" ? "Sending..." : "Subscribe"}
        </button>
      </div>
      <div aria-live="polite">
        {state === "error" && error && (
          <p id={messageId} role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        One email a day: the top AI stories from Phugialy. Unsubscribe anytime. By subscribing you
        agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
