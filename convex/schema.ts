import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  guestbook: defineTable({
    name: v.string(),
    message: v.string(),
    ip: v.optional(v.string()),
    moderated: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_moderated_and_created", ["moderated", "createdAt"]),

  weatherCache: defineTable({
    lat: v.number(),
    lon: v.number(),
    data: v.string(), // JSON stringified weather data
    expiresAt: v.number(),
  }).index("by_location", ["lat", "lon"]),

  rateLimits: defineTable({
    identifier: v.string(),
    endpoint: v.string(),
    requests: v.array(v.number()), // Array of timestamps
  }).index("by_identifier_and_endpoint", ["identifier", "endpoint"]),

  // Blog content management
  blogDrafts: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(), // Full article content or summary
    canonicalUrl: v.string(),
    source: v.string(), // RSS source name
    author: v.optional(v.string()),
    tags: v.array(v.string()),
    quality: v.optional(v.number()), // 1-5 star rating
    status: v.string(), // "new", "reviewed", "approved", "rejected", "published"
    publishDate: v.optional(v.number()), // Scheduled publish timestamp
    notes: v.optional(v.string()), // Internal notes
    metadata: v.optional(v.object({
      readTime: v.optional(v.number()),
      views: v.optional(v.number()),
      aiSummary: v.optional(v.string()),
      aiScore: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_publish_date", ["publishDate"])
    .index("by_slug", ["slug"]),
});

