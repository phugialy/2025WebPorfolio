// Keeps development, tests and preview deployments from downloading article
// images from the production Supabase Storage. Every image shown on a page is a
// direct download from the Supabase CDN, and that is the "cached egress" the
// project is billed and limited on (15.5 GB used against 5 GB on the free plan
// when it was restricted). A dev server or an end-to-end run that opens the blog
// pulls every card's picture, so each run costs megabytes it has no use for.
//
// Outside real production the image URLs the data layer hands to pages are swapped
// for a local placeholder. Set ALLOW_STORAGE_IMAGES=1 to see real pictures while
// developing, or BLOCK_STORAGE_IMAGES=1 to force the placeholder anywhere.

export const DEV_IMAGE_PLACEHOLDER = "/dev-image.svg";

type Env = Record<string, string | undefined>;

export function storageImagesBlocked(env: Env = process.env): boolean {
  if (env.ALLOW_STORAGE_IMAGES === "1") return false;
  if (env.BLOCK_STORAGE_IMAGES === "1") return true;
  return env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview";
}

const isStorageUrl = (url: string) => /\/storage\/v1\/(object|render)\//.test(url);

/** The URL itself in production; the local placeholder for a Supabase Storage URL anywhere else. */
export function guardImageUrl<T extends string | null | undefined>(url: T, env: Env = process.env): T | string {
  if (typeof url !== "string" || !isStorageUrl(url) || !storageImagesBlocked(env)) return url;
  return DEV_IMAGE_PLACEHOLDER;
}
