import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get cached weather data
 */
export const get = query({
  args: {
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, args) => {
    // Round to 2 decimal places for cache key
    const lat = Math.round(args.lat * 100) / 100;
    const lon = Math.round(args.lon * 100) / 100;

    const cached = await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) => q.eq("lat", lat).eq("lon", lon))
      .first();

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      return null;
    }

    return {
      data: JSON.parse(cached.data),
      expiresAt: cached.expiresAt,
    };
  },
});

/**
 * Set weather cache
 */
export const set = mutation({
  args: {
    lat: v.number(),
    lon: v.number(),
    data: v.string(), // JSON stringified
    ttlSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    // Round to 2 decimal places for cache key
    const lat = Math.round(args.lat * 100) / 100;
    const lon = Math.round(args.lon * 100) / 100;

    const expiresAt = Date.now() + args.ttlSeconds * 1000;

    // Check if entry exists
    const existing = await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) => q.eq("lat", lat).eq("lon", lon))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        expiresAt,
      });
    } else {
      await ctx.db.insert("weatherCache", {
        lat,
        lon,
        data: args.data,
        expiresAt,
      });
    }

    return { success: true };
  },
});

