"use client";

// Internal-navigation funnel tracking for Phase 4 (see PHASE_ROADMAP.md).
// Rides the GA4 setup already wired in components/analytics/google-analytics.tsx
// rather than standing up a new analytics backend — Vercel Web Analytics isn't
// enabled on this project, and a first-party events table would duplicate what
// GA4 already reports on. Resource -> affiliate-destination clicks are tracked
// separately and already, via the first-party affiliate_clicks table (that one
// stays first-party since it's revenue data worth owning directly).

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type NavigationEventName =
  | "article_to_article"
  | "article_to_hub"
  | "article_to_resource"
  | "lens_article_click"
  | "field_note_click"
  | "commercial_cta_click"
  | "contact_submit"
  | "opportunity_intent_selected"
  | "opportunity_brief_requested"
  | "ask_phugialy_click";

export function trackNavigationEvent(
  name: NavigationEventName,
  params: Record<string, string>
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, params);
}
