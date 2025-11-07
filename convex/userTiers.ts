import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user tier by email
 */
export const getUserTier = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return "guest";
    }

    return user.tier as "guest" | "authenticated" | "admin";
  },
});

/**
 * Get all users by tier
 */
export const getUsersByTier = query({
  args: {
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_tier", (q) => q.eq("tier", args.tier))
      .collect();

    return users;
  },
});

