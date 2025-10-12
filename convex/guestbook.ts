import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Post a guestbook entry
 * Rate limited to 3 per minute per IP
 */
export const post = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }
    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    // Sanitize inputs
    const name = args.name.trim().slice(0, 50);
    const message = args.message.trim().slice(0, 500);

    // Check rate limit if IP provided
    if (args.ip) {
      const recent = await ctx.db
        .query("guestbook")
        .filter((q) => q.eq(q.field("ip"), args.ip))
        .collect();
      
      const oneMinuteAgo = Date.now() - 60000;
      const recentRequests = recent.filter((r) => r.createdAt > oneMinuteAgo);
      
      if (recentRequests.length >= 3) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
    }

    // Simple spam heuristics
    const spamWords = ["viagra", "casino", "lottery", "click here", "buy now"];
    const lowerMessage = message.toLowerCase();
    if (spamWords.some((word) => lowerMessage.includes(word))) {
      throw new Error("Message flagged as spam");
    }

    // Insert guestbook entry
    const entryId = await ctx.db.insert("guestbook", {
      name,
      message,
      ip: args.ip,
      moderated: true, // Auto-approve for now; add manual moderation later
      createdAt: Date.now(),
    });

    return { success: true, id: entryId };
  },
});

/**
 * Get all approved guestbook entries
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("guestbook")
      .withIndex("by_moderated", (q) => q.eq("moderated", true))
      .order("desc")
      .take(50);
  },
});

/**
 * Moderate a guestbook entry (admin only - add auth in production)
 */
export const moderate = mutation({
  args: {
    id: v.id("guestbook"),
    moderated: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { moderated: args.moderated });
    return { success: true };
  },
});

