import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hash01 } from "@/lib/blog-rows";
import { fetchLinkPreview } from "@/lib/link-preview";
import { hasProductImage, isPublicHttpsUrl } from "@/lib/product-images";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

// The product picture engine. Pictures decide most purchases, so a product with a
// missing or placeholder picture (Amazon's logo) is repaired automatically instead
// of waiting for someone to run SQL:
//
//   1. Find active products whose picture is missing or the placeholder.
//   2. Read the product's own page (the same fetch the admin "paste a link" tool
//      uses) for its main picture, then check the picture really is an image of a
//      sensible size, at a public https address.
//   3. Save it, but only if the row still holds what was read (an admin who set a
//      picture in the meantime wins). A picture that is already good is never
//      replaced.
//   4. Each run also spot-checks one weekday's share of the existing pictures
//      (every product is checked about weekly) and repairs the ones that no longer
//      load.
//
// It goes slowly and stops at the first sign Amazon is challenging the fetches,
// because a few pictures a day is all this needs. A time budget keeps a slow day
// inside the function limit.

export const MIN_IMAGE_BYTES = 4000; // a real product picture is larger; placeholders and 1x1 gifs are not
const UA = "Mozilla/5.0 (compatible; PhugialyBot/1.0; +https://www.phugialy.com)";
const CHECK_BATCH = 6; // existing pictures checked at once

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
  budgetMs?: number; // stop starting new work after this long
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
  timedOut: boolean;
  leftOver: number; // products still needing a picture after this run
};

// True when the url loads and is an image big enough to be a product picture.
export async function verifyImageUrl(url: string): Promise<{ ok: boolean; reason?: string }> {
  // The address comes from a web page, so it is not trusted: public https only.
  if (!isPublicHttpsUrl(url)) return { ok: false, reason: "not a public https address" };
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
// per weekday, so every product is looked at about once a week. Uses the site's
// shared hash (lib/blog-rows.ts), the same one the rotation uses.
export function weeklyBucket(id: string, now: number): boolean {
  // The low bits of the 32-bit hash, which mix well even for ids that differ only at the end.
  return Math.floor(hash01(id) * 2 ** 32) % 7 === new Date(now).getUTCDay();
}

export async function runImageEngine(supabase: AdminClient, options: ImageRunOptions = {}): Promise<ImageRunResult> {
  const now = options.now ?? Date.now();
  const maxRepairs = options.maxRepairs ?? 8;
  const maxChecks = options.maxChecks ?? 20;
  const delayMs = options.delayMs ?? 1500;
  const deadline = Date.now() + (options.budgetMs ?? 45_000);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const dryRun = Boolean(options.dryRun);

  const { data, error } = await supabase
    .from("affiliate_products")
    .select("id, name, image_url, affiliate_url, is_partner")
    .eq("status", "active");
  if (error) throw error;
  // Partner placements (Ambit) carry their own brand art, not a product picture.
  const products = ((data || []) as ImageProductRow[]).filter((p) => !p.is_partner && p.affiliate_url);

  const result: ImageRunResult = {
    dryRun,
    scanned: products.length,
    missing: 0,
    checked: 0,
    broken: [],
    repaired: [],
    failed: [],
    blocked: false,
    timedOut: false,
    leftOver: 0,
  };

  // 1. Pictures that are missing or the placeholder.
  const needs = products.filter((p) => !hasProductImage(p.image_url));
  result.missing = needs.length;

  // 2. Spot-check today's share of the good pictures for ones that no longer
  //    load, a few at a time.
  const sample = products.filter((p) => hasProductImage(p.image_url) && weeklyBucket(p.id, now)).slice(0, maxChecks);
  const brokenIds = new Set<string>();
  for (let i = 0; i < sample.length; i += CHECK_BATCH) {
    if (Date.now() > deadline) {
      result.timedOut = true;
      break;
    }
    const batch = sample.slice(i, i + CHECK_BATCH);
    const checks = await Promise.all(batch.map((p) => verifyImageUrl(p.image_url!)));
    batch.forEach((product, index) => {
      result.checked += 1;
      if (!checks[index].ok) {
        brokenIds.add(product.id);
        result.broken.push({ id: product.id, name: product.name, reason: checks[index].reason || "unknown" });
      }
    });
  }

  const queue = [...needs, ...sample.filter((p) => brokenIds.has(p.id))];
  let fetches = 0;
  let challenged = 0;
  for (const product of queue) {
    if (fetches >= maxRepairs || result.blocked) break;
    if (Date.now() > deadline) {
      result.timedOut = true;
      break;
    }
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
      // Only write if the row still holds what was read above: if an admin set a
      // picture meanwhile, theirs stays.
      const base = supabase.from("affiliate_products").update({ image_url: preview.imageUrl, updated_at: new Date(now).toISOString() }).eq("id", product.id);
      const guarded = product.image_url === null ? base.is("image_url", null) : base.eq("image_url", product.image_url);
      const { data: written, error: updateError } = await guarded.select("id");
      if (updateError) {
        result.failed.push({ id: product.id, name: product.name, reason: `could not save: ${updateError.message}` });
        continue;
      }
      if (!written || written.length === 0) {
        result.failed.push({ id: product.id, name: product.name, reason: "picture was changed while the engine was working; left as it is" });
        continue;
      }
    }
    result.repaired.push({ id: product.id, name: product.name, before: product.image_url, after: preview.imageUrl });
  }

  const fixed = new Set(result.repaired.map((r) => r.id));
  result.leftOver = queue.filter((p) => !fixed.has(p.id)).length;
  return result;
}
