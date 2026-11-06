"use client";

import { useEffect } from "react";
import { trackNavigationEvent } from "@/lib/analytics";

// One listener for the whole Deals page, so the cards themselves stay plain
// server-rendered markup. It reads what a clicked link says about itself
// (data-deals-* attributes) and reports it to Google Analytics. This adds
// detail the server-side click log lacks (the rank of the card that was
// clicked); the outbound click itself is still logged by the server redirect.
export function DealsClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!link) return;
      const data = link.dataset;

      if (data.dealsProduct) {
        trackNavigationEvent("deals_product_click", {
          product_id: data.dealsProduct,
          product_name: (data.dealsName ?? "").slice(0, 100),
          section: data.dealsRef ?? "",
          rank: data.dealsRank ?? "",
        });
      } else if (data.dealsDeal) {
        trackNavigationEvent("deals_deal_click", {
          deal_id: data.dealsDeal,
          merchant: data.dealsMerchant ?? "",
        });
      } else if (data.dealsSeries) {
        trackNavigationEvent("deals_series_click", {
          series: data.dealsSeries,
          position: data.dealsPosition ?? "",
          kind: data.dealsKind ?? "",
        });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
