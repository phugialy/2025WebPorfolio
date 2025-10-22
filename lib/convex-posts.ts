import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Fallback for when Convex is not configured
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  canonicalUrl: string;
  source: string;
  author?: string;
  tags: string[];
  quality?: number;
  notes?: string;
  status: string;
  publishDate?: number;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    readTime?: number;
    aiSummary?: string;
    aiScore?: number;
    views?: number;
  };
}

/**
 * Get all published blog posts from Convex
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const posts = await convex.query(api.blog.listPublished, {});
    return posts || [];
  } catch (error) {
    console.error("Error fetching published posts:", error);
    return [];
  }
}

/**
 * Get all blog posts regardless of status (for testing)
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const posts = await convex.query(api.blog.listDrafts, {});
    return posts || [];
  } catch (error) {
    console.error("Error fetching all posts:", error);
    // Return mock data when Convex is not available
    return [
      {
        _id: "mock-1",
        title: "Welcome to My Portfolio",
        slug: "welcome-to-my-portfolio",
        content: "# Welcome to My Portfolio\n\nThis is a sample blog post to demonstrate the portfolio functionality.",
        canonicalUrl: "",
        source: "portfolio",
        author: "Phu Gia Ly",
        tags: ["portfolio", "introduction"],
        quality: 85,
        notes: "Sample post for demonstration",
        status: "published",
        publishDate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          readTime: 2,
          aiSummary: "An introduction to the portfolio website built with Next.js 15.",
          aiScore: 85,
          views: 0
        }
      }
    ];
  }
}

/**
 * Get all blog drafts from Convex (for admin use)
 */
export async function getAllDrafts(): Promise<BlogPost[]> {
  try {
    const drafts = await convex.query(api.blog.listDrafts, {});
    return drafts || [];
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return [];
  }
}

/**
 * Get a single blog post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const post = await convex.query(api.blog.getBySlug, { slug });
    return post;
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    // Return mock data for the welcome post
    if (slug === "welcome-to-my-portfolio") {
      return {
        _id: "mock-1",
        title: "Welcome to My Portfolio",
        slug: "welcome-to-my-portfolio",
        content: "# Welcome to My Portfolio\n\nThis is a sample blog post to demonstrate the portfolio functionality.\n\n## Features\n\n- Built with Next.js 15\n- TypeScript for type safety\n- Tailwind CSS for styling\n- MDX for rich content\n\n## Getting Started\n\nThis portfolio showcases modern web development practices and demonstrates various technical skills.",
        canonicalUrl: "",
        source: "portfolio",
        author: "Phu Gia Ly",
        tags: ["portfolio", "introduction"],
        quality: 85,
        notes: "Sample post for demonstration",
        status: "published",
        publishDate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          readTime: 2,
          aiSummary: "An introduction to the portfolio website built with Next.js 15.",
          aiScore: 85,
          views: 0
        }
      };
    }
    return null;
  }
}

/**
 * Get blog statistics
 */
export async function getBlogStats() {
  try {
    const stats = await convex.query(api.blog.getStats);
    return stats;
  } catch (error) {
    console.error("Error fetching blog stats:", error);
    return null;
  }
}

/**
 * Increment view count for a post
 */
export async function incrementPostViews(slug: string): Promise<void> {
  try {
    await convex.mutation(api.blog.incrementViews, { slug });
  } catch (error) {
    console.error(`Error incrementing views for ${slug}:`, error);
  }
}

/**
 * Update post status (for admin use)
 */
export async function updatePostStatus(
  id: string,
  status: string,
  publishDate?: number,
  notes?: string
): Promise<boolean> {
  try {
    await convex.mutation(api.blog.updateStatus, {
      id: id as Id<"blogDrafts">, // Type assertion for Convex ID
      status,
      publishDate,
      notes,
    });
    return true;
  } catch (error) {
    console.error(`Error updating post status:`, error);
    return false;
  }
}

/**
 * Update post quality rating (for admin use)
 */
export async function updatePostQuality(
  id: string,
  quality: number,
  notes?: string
): Promise<boolean> {
  try {
    await convex.mutation(api.blog.updateQuality, {
      id: id as Id<"blogDrafts">, // Type assertion for Convex ID
      quality,
      notes,
    });
    return true;
  } catch (error) {
    console.error(`Error updating post quality:`, error);
    return false;
  }
}
