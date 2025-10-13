import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new blog draft from n8n or other sources
 */
export const createDraft = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    canonicalUrl: v.string(),
    source: v.string(),
    author: v.optional(v.string()),
    tags: v.array(v.string()),
    quality: v.optional(v.number()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.object({
      readTime: v.optional(v.number()),
      aiSummary: v.optional(v.string()),
      aiScore: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if slug already exists
    const existing = await ctx.db
      .query("blogDrafts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      // Update existing draft instead of creating duplicate
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return { id: existing._id, status: "updated" };
    }

    // Create new draft
    const id = await ctx.db.insert("blogDrafts", {
      ...args,
      status: "new",
      publishDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: args.metadata || {},
    });

    return { id, status: "created" };
  },
});

/**
 * Get all drafts (for admin panel)
 */
export const listDrafts = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.status) {
      const status = args.status; // TypeScript type narrowing
      return await ctx.db
        .query("blogDrafts")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("blogDrafts")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all published posts (for public blog page)
 */
export const listPublished = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    return await ctx.db
      .query("blogDrafts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get a single post by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogDrafts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return post || null;
  },
});

/**
 * Increment view count for a post
 */
export const incrementViews = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogDrafts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (post && post.status === "published" && post.metadata) {
      const views = (post.metadata.views || 0) + 1;
      await ctx.db.patch(post._id, {
        metadata: {
          ...post.metadata,
          views,
        },
      });
    }
  },
});

/**
 * Update draft status (for admin approval)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("blogDrafts"),
    status: v.string(),
    publishDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      publishDate: args.publishDate,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update quality rating
 */
export const updateQuality = mutation({
  args: {
    id: v.id("blogDrafts"),
    quality: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      quality: args.quality,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a draft
 */
export const deleteDraft = mutation({
  args: { id: v.id("blogDrafts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Get draft statistics
 */
export const getStats = query({
  handler: async (ctx) => {
    const allDrafts = await ctx.db.query("blogDrafts").collect();

    return {
      total: allDrafts.length,
      new: allDrafts.filter((d) => d.status === "new").length,
      reviewed: allDrafts.filter((d) => d.status === "reviewed").length,
      approved: allDrafts.filter((d) => d.status === "approved").length,
      published: allDrafts.filter((d) => d.status === "published").length,
      rejected: allDrafts.filter((d) => d.status === "rejected").length,
    };
  },
});

