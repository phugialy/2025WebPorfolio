"use client";

// Impressions for the Deals pages. A page can show dozens of product cards, so
// instead of one request per card, the cards report themselves here and this
// sends them in small batches. Each product is counted once per tab session
// per section label, so scrolling a row back and forth never inflates it.

type Pending = { productId: string; ref: string };

const FLUSH_AFTER_MS = 2000;
const MAX_BATCH = 40;
const ENDPOINT = "/api/deals/track";

const seen = new Set<string>();
let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function alreadyCounted(key: string): boolean {
  if (seen.has(key)) return true;
  seen.add(key);
  try {
    const storageKey = `dealsimp:${key}`;
    if (sessionStorage.getItem(storageKey)) return true;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage blocked: the in-memory set still stops repeats in this view.
  }
  return false;
}

function send(batch: Pending[]) {
  if (batch.length === 0) return;
  const body = JSON.stringify({ impressions: batch });
  // keepalive lets the request finish even while the page is being left.
  fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => {}
  );
}

export function flushDealsImpressions() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length > 0) {
    send(queue.slice(0, MAX_BATCH));
    queue = queue.slice(MAX_BATCH);
  }
}

// `ref` is the full label, the same one the product's outbound link carries.
export function queueDealsImpression(productId: string, ref: string) {
  if (typeof window === "undefined" || alreadyCounted(`${ref}:${productId}`)) return;
  queue.push({ productId, ref });

  if (!listening) {
    listening = true;
    // Send what is queued when the reader leaves or switches tabs.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushDealsImpressions();
    });
    window.addEventListener("pagehide", flushDealsImpressions);
  }

  if (queue.length >= MAX_BATCH) {
    flushDealsImpressions();
  } else if (!timer) {
    timer = setTimeout(flushDealsImpressions, FLUSH_AFTER_MS);
  }
}
