import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Declare process for TypeScript (Convex provides process.env for environment variables)
declare const process: { env: { [key: string]: string | undefined } };

/**
 * Get current user's identity
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Check if user exists in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    return {
      ...identity,
      isAdmin: user?.isAdmin ?? false,
    };
  },
});

/**
 * Check if user is admin by email
 * Supports multiple admin emails
 * This is used with NextAuth.js (not Convex Auth)
 */
export const isAdmin = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Get admin emails from environment (comma-separated list)
    // Set ADMIN_EMAILS in Convex Dashboard: "email1@gmail.com,email2@gmail.com"
    const ADMIN_EMAILS_STR = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
    const adminEmails = ADMIN_EMAILS_STR
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    // Check if user exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return false;
    }

    // Check if user has isAdmin flag set to true (primary check)
    if (user.isAdmin === true) {
      return true;
    }

    // Fallback: Check if email is in the admin emails list
    const emailLower = args.email.toLowerCase();
    return adminEmails.includes(emailLower);
  },
});

/**
 * Mutation to create/update user after authentication
 * This is called from NextAuth callback
 */
export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get admin emails from environment (comma-separated list)
    // Set ADMIN_EMAILS in Convex Dashboard: "email1@gmail.com,email2@gmail.com"
    const ADMIN_EMAILS_STR = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
    const adminEmails = ADMIN_EMAILS_STR
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // Determine if user is admin (email is in admin list)
    const emailLower = args.email.toLowerCase();
    const isAdminUser = adminEmails.includes(emailLower) || existingUser?.isAdmin === true;
    const tier = isAdminUser ? "admin" : "authenticated";

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        image: args.image,
        tier: tier,
        isAdmin: isAdminUser,
        lastActiveAt: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        tier: tier,
        isAdmin: isAdminUser,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      return userId;
    }
  },
});

