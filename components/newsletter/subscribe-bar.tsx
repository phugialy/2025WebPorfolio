"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { BAR_DISMISSED_KEY, SUBSCRIBED_EVENT, SUBSCRIBED_KEY } from "@/components/newsletter/attribution";

// Pages where a signup prompt would be in the way or pointless.
const HIDDEN_PREFIXES = ["/admin", "/login", "/signup", "/account", "/newsletter", "/privacy", "/work"];
const SHOW_AFTER_MS = 8000;
const SHOW_AFTER_SCROLL = 0.3;
const DISMISS_DAYS = 14;

function readBlocked(): boolean {
  try {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return true;
    const until = Number(localStorage.getItem(BAR_DISMISSED_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

// A slim, dismissible bar pinned to the bottom of every public page. It
// overlays the page (fixed position), so showing it never moves the content.
export function SubscribeBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hiddenHere = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (hiddenHere || readBlocked()) {
      setVisible(false);
      return;
    }

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setVisible(true);
    };
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SHOW_AFTER_SCROLL) show();
    };
    const onSubscribed = () => setVisible(false);

    const timer = window.setTimeout(show, SHOW_AFTER_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(SUBSCRIBED_EVENT, onSubscribed);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(SUBSCRIBED_EVENT, onSubscribed);
    };
  }, [pathname, hiddenHere]);

  function dismiss() {
    try {
      localStorage.setItem(BAR_DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // Storage blocked: it may come back on the next page, which is acceptable.
    }
    setVisible(false);
  }

  if (!visible || hiddenHere) return null;

  return (
    <div
      role="region"
      aria-label="Subscribe to the daily email"
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
      }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-semibold text-foreground">
            The top AI stories, in your inbox every day.
          </p>
          <SubscribeForm source="bar" variant="bar" />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
