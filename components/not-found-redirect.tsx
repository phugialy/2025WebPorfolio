"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trackNavigationEvent } from "@/lib/analytics";

// Where a visitor who reached a missing page is sent, and how long the message
// stays up first (long enough to read, short enough not to feel stuck).
export const NOT_FOUND_TARGET = "/";
export const NOT_FOUND_TRACK_MS = 900;
export const NOT_FOUND_REDIRECT_MS = 1500;

// Runs on the not-found page. The server still answers 404, so search engines
// drop the dead address and we can see broken links; people are sent to the
// homepage. Before leaving it records which address was missing and where the
// visitor came from (a GA4 `page_not_found` event: path + referrer), which is how
// we find out what is sending people to dead pages. GA4 only loads on the live
// hosts, so this does nothing in dev or tests.
export function NotFoundRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === NOT_FOUND_TARGET) return;
    const track = setTimeout(() => {
      let referrer = "(none)";
      try {
        referrer = document.referrer.slice(0, 200) || "(none)";
      } catch {
        // keep "(none)"
      }
      trackNavigationEvent("page_not_found", { path: pathname.slice(0, 200), referrer, transport_type: "beacon" });
    }, NOT_FOUND_TRACK_MS);
    const go = setTimeout(() => router.replace(NOT_FOUND_TARGET), NOT_FOUND_REDIRECT_MS);
    return () => {
      clearTimeout(track);
      clearTimeout(go);
    };
  }, [pathname, router]);

  return null;
}
