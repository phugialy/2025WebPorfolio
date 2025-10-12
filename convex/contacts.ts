import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Submit a contact form
 * Rate limited to 5 per minute per IP
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
    honeypot: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Honeypot check
    if (args.honeypot && args.honeypot.length > 0) {
      throw new Error("Invalid submission");
    }

    // Validate inputs
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }
    if (!args.email || args.email.trim().length === 0 || !args.email.includes("@")) {
      throw new Error("Valid email is required");
    }
    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    // Sanitize inputs
    const name = args.name.trim().slice(0, 100);
    const email = args.email.trim().slice(0, 200);
    const message = args.message.trim().slice(0, 5000);

    // Check rate limit if IP provided
    if (args.ip) {
      const recent = await ctx.db
        .query("contacts")
        .filter((q) => q.eq(q.field("ip"), args.ip))
        .collect();
      
      const oneMinuteAgo = Date.now() - 60000;
      const recentRequests = recent.filter((r) => r.createdAt > oneMinuteAgo);
      
      if (recentRequests.length >= 5) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
    }

    // Insert contact
    const contactId = await ctx.db.insert("contacts", {
      name,
      email,
      message,
      ip: args.ip,
      createdAt: Date.now(),
    });

    return { success: true, id: contactId };
  },
});

/**
 * Get all contacts (admin only - in production, add auth)
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("contacts")
      .order("desc")
      .take(100);
  },
});

