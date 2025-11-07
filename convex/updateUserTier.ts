import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update user tier based on isAdmin flag
 * Use this to sync tier with isAdmin status
 */
export const updateUserTier = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update tier based on isAdmin flag
    const tier = user.isAdmin === true ? "admin" : "authenticated";

    await ctx.db.patch(user._id, {
      tier: tier,
    });

    return { success: true, tier };
  },
});

/**
 * Update all users' tiers based on their isAdmin flag
 * Useful for bulk updates
 */
export const syncAllUserTiers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    let updated = 0;
    for (const user of users) {
      const tier = user.isAdmin === true ? "admin" : "authenticated";
      if (user.tier !== tier) {
        await ctx.db.patch(user._id, {
          tier: tier,
        });
        updated++;
      }
    }

    return { success: true, updated, total: users.length };
  },
});

