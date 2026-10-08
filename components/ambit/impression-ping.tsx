"use client";

import { useEffect, useRef } from "react";

// For placements on client-rendered pages (the blog index), where the
// server-side logAffiliateImpression call the other pages use isn't possible.
// Fires once per tab session, only when the placement is actually on screen --
// stricter than a server render count, which keeps CTR honest.
export function ImpressionPing({ productId, refId }: { productId: string; refId: string }) {
  const sentinel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;

    const storageKey = `impression:${refId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      // Storage blocked: fall through and accept an occasional duplicate.
    }

    const send = () => {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {}
      fetch("/api/affiliate/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ref: refId }),
        keepalive: true,
      }).catch(() => {});
    };

    if (!("IntersectionObserver" in window)) {
      send();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          send();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [productId, refId]);

  return <span ref={sentinel} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
