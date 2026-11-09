// The shared clock and shuffle behind every scheduled rotation: what the Deals
// pages show (lib/deals-rotation.ts) and what the discovery engine looks for
// (lib/discovery-plan.ts). Pure: no database, no network, no "@/" imports.

import { hash01 } from "./blog-rows";

const HOUR = 3_600_000;

/** Display rotation length. The pages already say "Refreshed daily". */
export const ROTATION_HOURS = 24;
/** Boundaries fall at 05:00 UTC, the moment the rotate-deals cron runs. */
export const ROTATION_OFFSET_HOURS = 5;
/** The strategy (which product types to chase) is re-evaluated every 2 rotations: every 48 hours. */
export const REEVAL_BUCKETS = 2;

/** The rotation period `now` falls in. Changes once per ROTATION_HOURS, at the boundary. */
export function rotationBucket(now: number): number {
  return Math.floor((now - ROTATION_OFFSET_HOURS * HOUR) / (ROTATION_HOURS * HOUR));
}

/** When a bucket began, in ms. */
export function rotationStart(bucket: number): number {
  return bucket * ROTATION_HOURS * HOUR + ROTATION_OFFSET_HOURS * HOUR;
}

/** The 48-hour strategy period `now` falls in. */
export function reevalEpoch(now: number): number {
  return Math.floor(rotationBucket(now) / REEVAL_BUCKETS);
}

/** 0 on the day a new strategy period starts (re-evaluate today), 1 on the day after. */
export function dayInEpoch(now: number): number {
  const b = rotationBucket(now);
  return ((b % REEVAL_BUCKETS) + REEVAL_BUCKETS) % REEVAL_BUCKETS;
}

/**
 * Weighted-shuffle key (u^(1/weight), the same shuffle as lib/blog-rows.ts
 * rotateOrder). Higher goes earlier. Holds still for a given seed, changes
 * between seeds, and is always in (0, 1], so a rotated item sits above the 0
 * that means "no rotation".
 */
export function rotationKey(id: string, weight: number, seed: number): number {
  return Math.pow(hash01(`${seed}:${id}`), 1 / Math.max(0.1, weight));
}
