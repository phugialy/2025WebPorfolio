import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface WorkFrontmatter {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  featured?: boolean;
  year?: string;
  role?: string;
  duration?: string;
}

export interface Work {
  slug: string;
  frontmatter: WorkFrontmatter;
  content: string;
}

const workDirectory = path.join(process.cwd(), "content/work");

/**
 * Get all work items
 */
export function getAllWork(): Work[] {
  try {
    if (!fs.existsSync(workDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(workDirectory);
    const works = fileNames
      .filter((fileName) => fileName.endsWith(".mdx"))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        const fullPath = path.join(workDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        return {
          slug,
          frontmatter: data as WorkFrontmatter,
          content,
        };
      })
      .sort((a, b) => {
        return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
      });

    return works;
  } catch (error) {
    console.error("Error reading work:", error);
    return [];
  }
}

/**
 * Get a single work item by slug
 */
export function getWorkBySlug(slug: string): Work | null {
  try {
    const fullPath = path.join(workDirectory, `${slug}.mdx`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      frontmatter: data as WorkFrontmatter,
      content,
    };
  } catch (error) {
    console.error(`Error reading work ${slug}:`, error);
    return null;
  }
}

