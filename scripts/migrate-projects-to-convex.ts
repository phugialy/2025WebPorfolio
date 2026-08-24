/**
 * Migration script to migrate projects from lib/projects.ts to Convex.
 *
 * Run with: pnpm tsx scripts/migrate-projects-to-convex.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { projects } from "../lib/projects";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

type ProjectMigrationData = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  type: string;
  status: string;
  visible: boolean;
  featured: boolean;
  image?: string;
  slug?: string;
  role?: string;
  duration?: string;
  metrics?: string[];
  githubUrl?: string;
  repoAccess?: string;
  stars?: number;
  language?: string;
  demoUrl?: string;
  appUrl?: string;
  link?: string;
  note?: string;
};

if (!convexUrl) {
  console.error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

async function migrateProjects() {
  console.log("Starting project migration...\n");

  for (const project of projects) {
    try {
      console.log(`Migrating: ${project.title}...`);

      const projectData: ProjectMigrationData = {
        id: project.id,
        title: project.title,
        description: project.description,
        tags: project.tags,
        year: project.year,
        type: project.type,
        status: project.status,
        visible: true,
        featured: project.featured || false,
        image: project.image,
      };

      if (project.type === "case-study") {
        projectData.slug = project.slug;
        projectData.role = project.role;
        projectData.duration = project.duration;
        projectData.metrics = project.metrics;
      }

      if (project.type === "repository") {
        projectData.githubUrl = project.githubUrl;
        projectData.repoAccess = "public";
        projectData.stars = project.stars;
        projectData.language = project.language;
        projectData.demoUrl = project.demo;
      }

      if (project.type === "live-app") {
        projectData.appUrl = project.appUrl;
        projectData.githubUrl = project.githubUrl;
        projectData.demoUrl = project.appUrl;
      }

      if (project.type === "side-project") {
        projectData.link = project.link;
        projectData.note = project.note;
      }

      await client.mutation(api.projects.create, projectData);
      console.log(`Migrated: ${project.title}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("already exists") || message.includes("duplicate")) {
        console.log(`Already exists: ${project.title} (skipping)\n`);
      } else {
        console.error(`Error migrating ${project.title}:`, message);
        console.log();
      }
    }
  }

  console.log("Migration complete!");
}

migrateProjects().catch(console.error);
