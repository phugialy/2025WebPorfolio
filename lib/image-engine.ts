import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchLinkPreview } from "@/lib/link-preview";
import { hasProductImage } from "@/lib/product-images";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

// The product picture engine. Pictures decide most purchases, so a product with a
// missing or placeholder picture (Amazon's logo) is repaired automatically instead
// of waiting for someone to run SQL:
//
//   1. Find active products whose picture is missing or the placeholder.
//   2. Read the product's own page (the same fetch the admin "paste a link" tool
//      uses) for its main picture, then check the picture really is an image of a
//      sensible size.
//   3. Save it. A picture that is already good is never replaced; a manually set
//      picture stays.
//   4. Each run also spot-checks one weekday's share of the existing pictures
//      (every product is checked about weekly) and repairs the ones that no longer
//      load.
//
// It goes slowly and stops at the first sign Amazon is challenging the fetches,
// because a few pictures a day is all this needs.

export const MIN_IMAGE_BYTES = 4000; // a real product picture is larger; placeholders and 1x1 gifs are not
const UA = "Mozilla/5.0 (compatible; PhugialyBot/1.0; +https://www.phugialy.com)";

export type ImageProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  affiliate_url: string;
  is_partner: boolean | null;
};

export type ImageRunOptions = {
  now?: number;
  maxRepairs?: number; // page fetches per run
  maxChecks?: number; // existing pictures spot-checked per run
  dryRun?: boolean;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type ImageRunResult = {
  dryRun: boolean;
  scanned: number;
  missing: number;
  checked: number;
  broken: { id: string; name: string; reason: string }[];
  repaired: { id: string; name: string; before: string | null; after: string }[];
  failed: { id: string; name: string; reason: string }[];
  blocked: boolean;
  leftOver: number; // products still needing a picture after this run
};

// True when the url loads and is an image big enough to be a product picture.
export async function verifyImageUrl(url: string): Promise<{ ok: boolean; reason?: string }> {
  if (!/^https:\/\//i.test(url)) return { ok: false, reason: "not an https address" };
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-8191", "User-Agent": UA }, redirect: "follow" });
    if (res.status !== 200 && res.status !== 206) return { ok: false, reason: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") || "";
    if (!type.toLowerCase().startsWith("image/")) return { ok: false, reason: `not an image (${type || "no type"})` };
    const buffer = await res.arrayBuffer();
    const range = Number((res.headers.get("content-range") || "").split("/")[1]);
    const length = Number(res.headers.get("content-length"));
    const total = [range, length, buffer.byteLength].find((n) => Number.isFinite(n) && n > 0) ?? 0;
    if (total < MIN_IMAGE_BYTES) return { ok: false, reason: `too small (${total} bytes)` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "fetch failed" };
  }
}

// Which products get their existing picture spot-checked today: a stable share
// per weekday, so every product is looked at about once a week.
export function weeklyBucket(id: string, now: number): boolean {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 7 === new Date(now).getUTCDay();
}

export async function runImageEngine(supabase: AdminClient, options: ImageRunOptions = {}): Promise<ImageRunResult> {
  const now = options.now ?? Date.now();
  const maxRepairs = options.maxRepairs ?? 8;
  const maxChecks = options.maxChecks ?? 20;
  const delayMs = options.delayMs ?? 1500;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const dryRun = Boolean(options.dryRun);

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("id, name, image_url, affiliate_url, is_partner")
    .eq("status", "active");
  if (error) throw error;
  // Partner placements (Ambit) carry their own brand art, not a product picture.
  const products = ((data || []) as ImageProductRow[]).filter((p) => !p.is_partner && p.affiliate_url);

  const result: ImageRunResult = { dryRun, scanned: products.length, missing: 0, checked: 0, broken: [], repaired: [], failed: [], blocked: false, leftOver: 0 };

  // 1. Pictures that are missing or the placeholder.
  const needs = products.filter((p) => !hasProductImage(p.image_url));
  result.missing = needs.length;

  // 2. Spot-check today's share of the good pictures for ones that no longer load.
  const sample = products.filter((p) => hasProductImage(p.image_url) && weeklyBucket(p.id, now)).slice(0, maxChecks);
  const brokenIds = new Set<string>();
  for (const product of sample) {
    const check = await verifyImageUrl(product.image_url!);
    result.checked += 1;
    if (!check.ok) {
      brokenIds.add(product.id);
      result.broken.push({ id: product.id, name: product.name, reason: check.reason || "unknown" });
    }
  }

  const queue = [...needs, ...sample.filter((p) => brokenIds.has(p.id))];
  let fetches = 0;
  let challenged = 0;
  for (const product of queue) {
    if (fetches >= maxRepairs || result.blocked) break;
    if (fetches > 0) await sleep(delayMs);
    fetches += 1;

    let preview: Awaited<ReturnType<typeof fetchLinkPreview>>;
    try {
      preview = await fetchLinkPreview(product.affiliate_url);
    } catch (e) {
      result.failed.push({ id: product.id, name: product.name, reason: e instanceof Error ? e.message : "page fetch failed" });
      challenged += 1;
      if (challenged >= 2) result.blocked = true;
      continue;
    }
    // No title and no picture usually means the page was a challenge, not a product.
    if (!preview.imageUrl && (!preview.name || preview.name === "Untitled product")) {
      result.failed.push({ id: product.id, name: product.name, reason: "page gave no product details (possibly challenged)" });
      challenged += 1;
      if (challenged >= 2) result.blocked = true;
      continue;
    }
    challenged = 0;
    if (!hasProductImage(preview.imageUrl)) {
      result.failed.push({ id: product.id, name: product.name, reason: "no product picture found on the page" });
      continue;
    }
    const check = await verifyImageUrl(preview.imageUrl);
    if (!check.ok) {
      result.failed.push({ id: product.id, name: product.name, reason: `picture rejected: ${check.reason}` });
      continue;
    }
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("affiliate_products")
        .update({ image_url: preview.imageUrl, updated_at: new Date(now).toISOString() })
        .eq("id", product.id);
      if (updateError) {
        result.failed.push({ id: product.id, name: product.name, reason: `could not save: ${updateError.message}` });
        continue;
      }
    }
    result.repaired.push({ id: product.id, name: product.name, before: product.image_url, after: preview.imageUrl });
  }

  const fixed = new Set(result.repaired.map((r) => r.id));
  result.leftOver = queue.filter((p) => !fixed.has(p.id)).length;
  return result;
}
