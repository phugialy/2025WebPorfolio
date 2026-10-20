// Remembers the campaign tags a visitor landed with (utm_*) for the rest of the
// browser session, so a signup on a later page is still credited to the ad or
// link that brought them in.

const KEY = "phg_utm";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign"] as const;

type Utm = Partial<Record<(typeof FIELDS)[number], string>>;

export function captureUtm(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Utm = {};
    for (const field of FIELDS) {
      const value = params.get(field);
      if (value) found[field] = value.slice(0, 100);
    }
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem(KEY, JSON.stringify(found));
    }
  } catch {
    // Storage blocked: attribution is simply unavailable.
  }
}

export function readUtm(): Utm {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Utm) : {};
  } catch {
    return {};
  }
}

export const SUBSCRIBED_KEY = "phg_subscribed";
export const SUBSCRIBED_EVENT = "phg-newsletter-subscribed";
export const BAR_DISMISSED_KEY = "phg_bar_dismissed_until";
