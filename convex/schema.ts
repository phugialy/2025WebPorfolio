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

  // Blog interaction tracking
  blogInteractions: defineTable({
    postSlug: v.string(),
    interactionType: v.string(), // "click", "scroll", "time_spent", "tag_click", "search", "filter"
    value: v.optional(v.number()), // For scroll depth (0-100), time spent (seconds), etc.
    metadata: v.optional(v.object({
      tag: v.optional(v.string()), // Tag that was clicked
      searchQuery: v.optional(v.string()), // Search query used
      filterType: v.optional(v.string()), // Filter type (tag, date, source)
      filterValue: v.optional(v.string()), // Filter value
      userAgent: v.optional(v.string()),
      referrer: v.optional(v.string()),
    })),
    sessionId: v.optional(v.string()), // Optional session identifier
    createdAt: v.number(),
  })
    .index("by_post_slug", ["postSlug"])
    .index("by_type", ["interactionType"])
    .index("by_created_at", ["createdAt"])
    .index("by_post_and_type", ["postSlug", "interactionType"]),

  // Portfolio projects management
  projects: defineTable({
    id: v.string(), // Unique identifier
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    year: v.string(),
    type: v.string(), // "case-study" | "repository" | "live-app" | "side-project"
    status: v.string(), // "featured" | "active" | "archived" | "in-progress"
    visible: v.boolean(), // Admin control: show/hide project
    featured: v.boolean(),
    order: v.optional(v.number()), // Ranking/display order (lower = higher priority)
    image: v.optional(v.string()),
    
    // Type-specific fields
    slug: v.optional(v.string()), // For case-study type
    role: v.optional(v.string()),
    duration: v.optional(v.string()),
    metrics: v.optional(v.array(v.string())),
    
    // Repository fields
    githubUrl: v.optional(v.string()),
    repoAccess: v.string(), // "public" | "private" | "request-access"
    hideRepoButton: v.optional(v.boolean()), // Hide repo button for private repos with live sites
    stars: v.optional(v.number()),
    language: v.optional(v.string()),
    
    // Live app fields
    demoUrl: v.optional(v.string()),
    appUrl: v.optional(v.string()),
    
    // Side project fields
    link: v.optional(v.string()),
    note: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_visible", ["visible"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_featured", ["featured"])
    .index("by_order", ["order"]),
    // Note: "by_id" is reserved by Convex, so we use filter queries instead

  // Repository access requests
  repoAccessRequests: defineTable({
    projectId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(), // "pending" | "approved" | "rejected"
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),
});

