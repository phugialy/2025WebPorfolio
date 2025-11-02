import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track a blog interaction (click, scroll, time spent, etc.)
 */
export const trackInteraction = mutation({
  args: {
    postSlug: v.string(),
    interactionType: v.string(),
    value: v.optional(v.number()),
    metadata: v.optional(v.object({
      tag: v.optional(v.string()),
      searchQuery: v.optional(v.string()),
      filterType: v.optional(v.string()),
      filterValue: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      referrer: v.optional(v.string()),
    })),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("blogInteractions", {
        postSlug: args.postSlug,
        interactionType: args.interactionType,
        value: args.value,
        metadata: args.metadata,
        sessionId: args.sessionId,
        createdAt: Date.now(),
      });
      return { success: true };
    } catch (error) {
      // Silently fail - tracking should not break the app
      return { success: false };
    }
  },
});

/**
 * Track multiple interactions in a batch
 */
export const trackBatchInteractions = mutation({
  args: {
    interactions: v.array(v.object({
      postSlug: v.string(),
      interactionType: v.string(),
      value: v.optional(v.number()),
      metadata: v.optional(v.object({
        tag: v.optional(v.string()),
        searchQuery: v.optional(v.string()),
        filterType: v.optional(v.string()),
        filterValue: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })),
      sessionId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    try {
      const timestamp = Date.now();
      const promises = args.interactions.map((interaction) =>
        ctx.db.insert("blogInteractions", {
          ...interaction,
          createdAt: timestamp,
        })
      );
      await Promise.all(promises);
      return { success: true, count: args.interactions.length };
    } catch (error) {
      return { success: false, count: 0 };
    }
  },
});

/**
 * Get interaction stats for a specific post
 */
export const getPostInteractionStats = query({
  args: { postSlug: v.string() },
  handler: async (ctx, args) => {
    try {
      const interactions = await ctx.db
        .query("blogInteractions")
        .withIndex("by_post_slug", (q) => q.eq("postSlug", args.postSlug))
        .collect();

      const stats = {
        clicks: 0,
        avgScrollDepth: 0,
        avgTimeSpent: 0,
        tagClicks: {} as Record<string, number>,
        totalInteractions: interactions.length,
      };

      let scrollDepths: number[] = [];
      let timeSpent: number[] = [];

      interactions.forEach((interaction) => {
        if (interaction.interactionType === "click") {
          stats.clicks++;
        } else if (interaction.interactionType === "scroll" && interaction.value !== undefined) {
          scrollDepths.push(interaction.value);
        } else if (interaction.interactionType === "time_spent" && interaction.value !== undefined) {
          timeSpent.push(interaction.value);
        } else if (interaction.interactionType === "tag_click" && interaction.metadata?.tag) {
          const tag = interaction.metadata.tag;
          stats.tagClicks[tag] = (stats.tagClicks[tag] || 0) + 1;
        }
      });

      if (scrollDepths.length > 0) {
        stats.avgScrollDepth = scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length;
      }

      if (timeSpent.length > 0) {
        stats.avgTimeSpent = timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length;
      }

      return stats;
    } catch (error) {
      return null;
    }
  },
});

/**
 * Get popular posts based on interactions
 */
export const getPopularPosts = query({
  args: {
    limit: v.optional(v.number()),
    timeRange: v.optional(v.number()), // Milliseconds, e.g., 7 days = 7 * 24 * 60 * 60 * 1000
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 10;
      const timeRange = args.timeRange || 7 * 24 * 60 * 60 * 1000; // Default 7 days
      const cutoffTime = Date.now() - timeRange;

      const interactions = await ctx.db
        .query("blogInteractions")
        .withIndex("by_created_at")
        .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
        .collect();

      // Count clicks per post
      const postClicks: Record<string, number> = {};
      interactions.forEach((interaction) => {
        if (interaction.interactionType === "click") {
          postClicks[interaction.postSlug] = (postClicks[interaction.postSlug] || 0) + 1;
        }
      });

      // Sort by clicks and return top posts
      const sortedPosts = Object.entries(postClicks)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([slug, clicks]) => ({ slug, clicks }));

      return sortedPosts;
    } catch (error) {
      return [];
    }
  },
});

/**
 * Get search query analytics
 */
export const getSearchAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;
      const interactions = await ctx.db
        .query("blogInteractions")
        .withIndex("by_type", (q) => q.eq("interactionType", "search"))
        .collect();

      const searchCounts: Record<string, number> = {};
      interactions.forEach((interaction) => {
        const query = interaction.metadata?.searchQuery;
        if (query) {
          searchCounts[query] = (searchCounts[query] || 0) + 1;
        }
      });

      return Object.entries(searchCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));
    } catch (error) {
      return [];
    }
  },
});

/**
 * Get tag click analytics
 */
export const getTagAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;
      const interactions = await ctx.db
        .query("blogInteractions")
        .withIndex("by_type", (q) => q.eq("interactionType", "tag_click"))
        .collect();

      const tagCounts: Record<string, number> = {};
      interactions.forEach((interaction) => {
        const tag = interaction.metadata?.tag;
        if (tag) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    } catch (error) {
      return [];
    }
  },
});

