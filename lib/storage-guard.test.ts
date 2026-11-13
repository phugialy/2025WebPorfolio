import { describe, expect, it } from "vitest";
import { DEV_IMAGE_PLACEHOLDER, guardImageUrl, storageImagesBlocked } from "./storage-guard";

const STORAGE = "https://abc.supabase.co/storage/v1/object/public/article-images/slug/1-hero.jpg";
const RENDER = "https://abc.supabase.co/storage/v1/render/image/public/article-images/slug/1-hero.jpg?width=400";
const AMAZON = "https://m.media-amazon.com/images/I/616-8VSyqdL._AC_SL1500_.jpg";

describe("keeping non-production runs off the production image storage", () => {
  it("shows real pictures only in real production", () => {
    expect(storageImagesBlocked({ NODE_ENV: "production" })).toBe(false);
    expect(storageImagesBlocked({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(storageImagesBlocked({ NODE_ENV: "development" })).toBe(true);
    expect(storageImagesBlocked({ NODE_ENV: "test" })).toBe(true);
    expect(storageImagesBlocked({})).toBe(true);
    expect(storageImagesBlocked({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("can be switched on and off by hand, and the switch to allow wins", () => {
    expect(storageImagesBlocked({ NODE_ENV: "development", ALLOW_STORAGE_IMAGES: "1" })).toBe(false);
    expect(storageImagesBlocked({ NODE_ENV: "production", BLOCK_STORAGE_IMAGES: "1" })).toBe(true);
    expect(storageImagesBlocked({ NODE_ENV: "production", BLOCK_STORAGE_IMAGES: "1", ALLOW_STORAGE_IMAGES: "1" })).toBe(false);
  });

  it("swaps a Supabase Storage URL for the local placeholder when blocked, and leaves every other URL alone", () => {
    const dev = { NODE_ENV: "development" };
    expect(guardImageUrl(STORAGE, dev)).toBe(DEV_IMAGE_PLACEHOLDER);
    expect(guardImageUrl(RENDER, dev)).toBe(DEV_IMAGE_PLACEHOLDER);
    expect(guardImageUrl(AMAZON, dev)).toBe(AMAZON);
    expect(guardImageUrl("/brand/logo.png", dev)).toBe("/brand/logo.png");
    expect(guardImageUrl(null, dev)).toBeNull();
    expect(guardImageUrl(undefined, dev)).toBeUndefined();
    expect(guardImageUrl("", dev)).toBe("");
  });

  it("returns the URL untouched in production", () => {
    expect(guardImageUrl(STORAGE, { NODE_ENV: "production" })).toBe(STORAGE);
  });
});
