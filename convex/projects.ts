import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all visible projects
 */
export const listVisible = query({
  handler: async (ctx) => {
    try {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_visible", (q) => q.eq("visible", true))
        .collect();
      
      // Sort by order (ascending), then by updatedAt descending
      // Default order to 9999 if not set
      return projects.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        const orderDiff = orderA - orderB;
        if (orderDiff !== 0) return orderDiff;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
    } catch (error: any) {
      // If table doesn't exist, return empty array
      // Error is logged server-side by Convex automatically
      return [];
    }
  },
});

/**
 * Get all projects (admin only)
 */
export const listAll = query({
  handler: async (ctx) => {
    try {
      const projects = await ctx.db
        .query("projects")
        .collect();
      
      // Sort by order (ascending), then by updatedAt descending
      // Default order to 9999 if not set
      return projects.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        const orderDiff = orderA - orderB;
        if (orderDiff !== 0) return orderDiff;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
    } catch (error: any) {
      // If table doesn't exist, return empty array
      // Error is logged server-side by Convex automatically
      return [];
    }
  },
});

/**
 * Get project by ID
 */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      const projects = await ctx.db
        .query("projects")
        .filter((q) => q.eq(q.field("id"), args.id))
        .collect();
      
      return projects[0] || null;
    } catch (error: any) {
      // If table doesn't exist, return null
      // Error is logged server-side by Convex automatically
      return null;
    }
  },
});

/**
 * Get projects by type
 */
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    try {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_visible", (q) => q.eq("visible", true))
        .collect();
      
      const filtered = projects.filter((p) => p.type === args.type);
      
      // Sort by order (ascending), then by updatedAt descending
      return filtered.sort((a, b) => {
        const orderDiff = (a.order || 9999) - (b.order || 9999);
        if (orderDiff !== 0) return orderDiff;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
    } catch (error: any) {
      // If table doesn't exist, return empty array
      // Error is logged server-side by Convex automatically
      return [];
    }
  },
});

/**
 * Get featured projects
 */
export const getFeatured = query({
  handler: async (ctx) => {
    try {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_visible", (q) => q.eq("visible", true))
        .collect();
      
      const featured = projects.filter((p) => p.featured === true);
      
      // Sort by order (ascending), then by updatedAt descending
      // Default order to 9999 if not set
      return featured.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        const orderDiff = orderA - orderB;
        if (orderDiff !== 0) return orderDiff;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
    } catch (error: any) {
      // If table doesn't exist, return empty array
      // Error is logged server-side by Convex automatically
      return [];
    }
  },
});

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    year: v.string(),
    type: v.string(),
    status: v.string(),
    visible: v.boolean(),
    featured: v.boolean(),
    order: v.optional(v.number()),
    image: v.optional(v.string()),
    slug: v.optional(v.string()),
    role: v.optional(v.string()),
    duration: v.optional(v.string()),
    metrics: v.optional(v.array(v.string())),
    githubUrl: v.optional(v.string()),
    repoAccess: v.optional(v.string()),
    hideRepoButton: v.optional(v.boolean()),
    stars: v.optional(v.number()),
    language: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    appUrl: v.optional(v.string()),
    link: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      ...args,
      repoAccess: args.repoAccess || "public",
      hideRepoButton: args.hideRepoButton ?? false,
      order: args.order ?? 9999,
      createdAt: now,
      updatedAt: now,
    });
    return projectId;
  },
});

/**
 * Update project visibility
 */
export const updateVisibility = mutation({
  args: {
    id: v.string(),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("id"), args.id))
      .collect();
    
    const project = projects[0];
    if (!project) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(project._id, {
      visible: args.visible,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update project order/ranking
 */
export const updateOrder = mutation({
  args: {
    id: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("id"), args.id))
      .collect();
    
    const project = projects[0];
    if (!project) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(project._id, {
      order: args.order,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update project
 */
export const update = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    order: v.optional(v.number()),
    githubUrl: v.optional(v.string()),
    repoAccess: v.optional(v.string()),
    hideRepoButton: v.optional(v.boolean()),
    demoUrl: v.optional(v.string()),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("id"), id))
      .collect();
    
    const project = projects[0];
    if (!project) {
      throw new Error("Project not found");
    }

    // Build patch object with only defined values
    const patchData: any = {
      updatedAt: Date.now(),
    };

    // Only include fields that are explicitly provided
    if (args.title !== undefined) patchData.title = args.title;
    if (args.description !== undefined) patchData.description = args.description;
    if (args.tags !== undefined) patchData.tags = args.tags;
    if (args.status !== undefined) patchData.status = args.status;
    if (args.visible !== undefined) patchData.visible = args.visible;
    if (args.featured !== undefined) patchData.featured = args.featured;
    if (args.order !== undefined) patchData.order = args.order;
    if (args.githubUrl !== undefined) patchData.githubUrl = args.githubUrl || undefined;
    if (args.repoAccess !== undefined) patchData.repoAccess = args.repoAccess;
    if (args.hideRepoButton !== undefined) patchData.hideRepoButton = args.hideRepoButton;
    if (args.demoUrl !== undefined) patchData.demoUrl = args.demoUrl || undefined;
    if (args.appUrl !== undefined) patchData.appUrl = args.appUrl || undefined;

    await ctx.db.patch(project._id, patchData);

    return { success: true };
  },
});

/**
 * Delete project
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("id"), args.id))
      .collect();
    
    const project = projects[0];
    if (!project) {
      throw new Error("Project not found");
    }

    await ctx.db.delete(project._id);
    return { success: true };
  },
});

/**
 * Submit repository access request
 */
export const requestRepoAccess = mutation({
  args: {
    projectId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert("repoAccessRequests", {
      projectId: args.projectId,
      email: args.email,
      name: args.name,
      message: args.message,
      status: "pending",
      createdAt: Date.now(),
    });
    return { id: requestId, success: true };
  },
});

/**
 * Get access requests for a project
 */
export const getAccessRequests = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    try {
      const requests = await ctx.db
        .query("repoAccessRequests")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .collect();
      return requests;
    } catch (error: any) {
      return [];
    }
  },
});

/**
 * Approve access request
 */
export const approveAccessRequest = mutation({
  args: { requestId: v.id("repoAccessRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: "approved",
      approvedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Sync GitHub repository to project
 */
export const syncGitHubRepo = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    description: v.string(),
    githubUrl: v.string(),
    stars: v.optional(v.number()),
    language: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    year: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    order: v.optional(v.number()),
    demoUrl: v.optional(v.string()),
    repoAccess: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if project already exists
    const existing = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (existing) {
      // Update existing project
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        githubUrl: args.githubUrl,
        tags: args.tags || existing.tags,
        updatedAt: now,
        ...(args.stars !== undefined && { stars: args.stars }),
        ...(args.language && { language: args.language }),
        ...(args.demoUrl && { demoUrl: args.demoUrl }),
        ...(args.visible !== undefined && { visible: args.visible }),
        ...(args.featured !== undefined && { featured: args.featured }),
        ...(args.order !== undefined && { order: args.order }),
        ...(args.repoAccess && { repoAccess: args.repoAccess }),
      });
      return { id: existing._id, action: "updated" };
    } else {
      // Create new project
      const projectId = await ctx.db.insert("projects", {
        id: args.id,
        title: args.title,
        description: args.description,
        tags: args.tags || [],
        year: args.year || new Date().getFullYear().toString(),
        type: "repository",
        status: "active",
        visible: args.visible ?? true,
        featured: args.featured ?? false,
        order: args.order ?? 9999,
        githubUrl: args.githubUrl,
        repoAccess: args.repoAccess || "public",
        stars: args.stars,
        language: args.language,
        demoUrl: args.demoUrl,
        createdAt: now,
        updatedAt: now,
      });
      return { id: projectId, action: "created" };
    }
  },
});

/**
 * Bulk sync GitHub repositories
 */
export const bulkSyncGitHubRepos = mutation({
  args: {
    repos: v.array(v.object({
      id: v.string(),
      name: v.string(),
      fullName: v.string(),
      description: v.string(),
      url: v.string(),
      stars: v.optional(v.number()),
      language: v.optional(v.string()),
      topics: v.optional(v.array(v.string())),
      homepage: v.optional(v.string()),
    })),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];
    const now = Date.now();
    const currentYear = new Date().getFullYear().toString();

    for (const repo of args.repos) {
      try {
        // Create project ID from repo name
        const projectId = `${args.username}-${repo.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        
        // Check if exists
        const existing = await ctx.db
          .query("projects")
          .filter((q) => q.eq(q.field("id"), projectId))
          .first();

        const projectData = {
          id: projectId,
          title: repo.name,
          description: repo.description || `Repository: ${repo.fullName}`,
          tags: repo.topics || [],
          year: currentYear,
          type: "repository" as const,
          status: "active" as const,
          visible: true,
          featured: false,
          order: 9999,
          githubUrl: repo.url,
          repoAccess: "public" as const,
          stars: repo.stars || 0,
          language: repo.language,
          demoUrl: repo.homepage,
          updatedAt: now,
        };

        if (existing) {
          // Update existing
          await ctx.db.patch(existing._id, {
            ...projectData,
            createdAt: existing.createdAt, // Preserve original creation date
            order: existing.order || 9999, // Preserve existing order
          });
          results.push({ id: projectId, action: "updated", title: repo.name });
        } else {
          // Create new
          const newId = await ctx.db.insert("projects", {
            ...projectData,
            createdAt: now,
          });
          results.push({ id: projectId, action: "created", title: repo.name });
        }
      } catch (error) {
        results.push({ id: repo.name, action: "error", error: String(error) });
      }
    }

    return {
      success: true,
      total: args.repos.length,
      results,
    };
  },
});
