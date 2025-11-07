"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EnhancedProjectCard } from "@/components/work/enhanced-project-card";
import { FeaturedProjectCard } from "@/components/work/featured-project-card";

export function WorkPageContent() {
  const featuredProjects = useQuery(api.projects.getFeatured);
  const allProjects = useQuery(api.projects.listVisible);

  // Show loading state
  if (featuredProjects === undefined || allProjects === undefined) {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </main>
    );
  }

  // Handle case where queries return null (shouldn't happen with our error handling, but just in case)
  const safeFeaturedProjects = Array.isArray(featuredProjects) ? featuredProjects : [];
  const safeAllProjects = Array.isArray(allProjects) ? allProjects : [];

  // Group projects by type (include featured projects in their type sections too)
  const caseStudies = safeAllProjects.filter((p) => p.type === "case-study");
  const repositories = safeAllProjects.filter((p) => p.type === "repository");
  const liveApps = safeAllProjects.filter((p) => p.type === "live-app");
  const sideProjects = safeAllProjects.filter((p) => p.type === "side-project");

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">My Work</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Featured projects, case studies, and open-source contributions showcasing expertise in modern web development.
          </p>
        </header>

        {/* Featured Projects - Using FeaturedProjectCard */}
        {safeFeaturedProjects.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">Featured Projects</h2>
                <span className="text-sm text-muted-foreground">
                  ({safeFeaturedProjects.length})
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {safeFeaturedProjects.map((project) => (
                <FeaturedProjectCard key={`featured-${project._id}`} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Case Studies */}
        {caseStudies.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Case Studies</h2>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {caseStudies.length} {caseStudies.length === 1 ? "project" : "projects"}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {caseStudies.map((project) => (
                <EnhancedProjectCard key={project._id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* GitHub Repositories */}
        {repositories.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Open Source</h2>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {repositories.length} {repositories.length === 1 ? "repository" : "repositories"}
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repositories.map((project) => (
                <EnhancedProjectCard key={project._id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Live Apps */}
        {liveApps.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Live Demos</h2>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {liveApps.length} {liveApps.length === 1 ? "demo" : "demos"}
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveApps.map((project) => (
                <EnhancedProjectCard key={project._id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Side Projects */}
        {sideProjects.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Side Projects</h2>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {sideProjects.length} {sideProjects.length === 1 ? "project" : "projects"}
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sideProjects.map((project) => (
                <EnhancedProjectCard key={project._id} project={project} />
              ))}
            </div>
          </section>
        )}

        {safeAllProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No projects available at the moment.</p>
            <p className="text-sm text-muted-foreground mb-4">
              {!process.env.NEXT_PUBLIC_CONVEX_URL 
                ? "⚠️ Convex is not configured. Please set NEXT_PUBLIC_CONVEX_URL in .env.local"
                : "Add projects via the admin dashboard or Convex dashboard."}
            </p>
            {process.env.NEXT_PUBLIC_CONVEX_URL && (
              <p className="text-xs text-muted-foreground">
                Make sure to run <code className="px-2 py-1 bg-muted rounded">pnpm convex dev</code> to deploy the schema.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

