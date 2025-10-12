import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostFrontmatter {
  title: string;
  date: string;
  tags?: string[];
  summary?: string;
  canonical_link?: string;
  author?: string;
  featured?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

const postsDirectory = path.join(process.cwd(), "content/blog");

/**
 * Get all blog posts with frontmatter
 */
export function getAllPosts(): Post[] {
  try {
    // Ensure directory exists
    if (!fs.existsSync(postsDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const posts = fileNames
      .filter((fileName) => fileName.endsWith(".mdx"))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        return {
          slug,
          frontmatter: data as PostFrontmatter,
          content,
        };
      })
      .sort((a, b) => {
        // Sort by date, newest first
        return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
      });

    return posts;
  } catch (error) {
    console.error("Error reading posts:", error);
    return [];
  }
}

/**
 * Get a single post by slug
 */
export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content,
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

/**
 * Get featured posts
 */
export function getFeaturedPosts(limit = 3): Post[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => post.frontmatter.featured).slice(0, limit);
}

/**
 * Get posts by tag
 */
export function getPostsByTag(tag: string): Post[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.frontmatter.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

