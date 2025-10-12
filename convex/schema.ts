import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_creation_time", ["createdAt"]),

  guestbook: defineTable({
    name: v.string(),
    message: v.string(),
    ip: v.optional(v.string()),
    moderated: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_creation_time", ["createdAt"])
    .index("by_moderated", ["moderated", "createdAt"]),

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
  }).index("by_identifier_endpoint", ["identifier", "endpoint"]),
});

