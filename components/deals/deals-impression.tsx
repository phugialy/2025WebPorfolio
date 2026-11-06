"use client";

import { useEffect, useRef } from "react";
import { queueDealsImpression } from "@/lib/deals-tracking";

// Sits inside a product card and reports it once it is mostly on screen.
// `refLabel` is the same label the card's outbound link carries.
export function DealsImpression({ productId, refLabel }: { productId: string; refLabel: string }) {
  const sentinel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      queueDealsImpression(productId, refLabel);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          queueDealsImpression(productId, refLabel);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [productId, refLabel]);

  return <span ref={sentinel} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
