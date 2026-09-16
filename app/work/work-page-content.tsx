"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { EnhancedProjectCard } from "@/components/work/enhanced-project-card";
import { FeaturedProjectCard } from "@/components/work/featured-project-card";
import type { Project } from "@/lib/projects";

export function WorkPageContent() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, []);

  // Admin status is computed server-side in the NextAuth session callback
  // (ADMIN_EMAIL comparison) -- no separate Convex query needed here.
  const isAdmin = session?.user?.isAdmin;

  // Determine user tier
  const userTier = session?.user
    ? (isAdmin ? "admin" : "authenticated")
    : "guest";

  // Show loading state
  if (projects === null) {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </main>
    );
  }

  const safeAllProjects = projects;
  const safeFeaturedProjects = projects.filter((p) => p.featured);

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
                <FeaturedProjectCard 
                  key={`featured-${project.id}`} 
                  project={project}
                  userTier={userTier}
                />
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
                <EnhancedProjectCard 
                  key={project.id} 
                  project={project}
                  userTier={userTier}
                />
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
                <EnhancedProjectCard 
                  key={project.id} 
                  project={project}
                  userTier={userTier}
                />
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
                <EnhancedProjectCard 
                  key={project.id} 
                  project={project}
                  userTier={userTier}
                />
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
                <EnhancedProjectCard 
                  key={project.id} 
                  project={project}
                  userTier={userTier}
                />
              ))}
            </div>
          </section>
        )}

        {safeAllProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No projects available at the moment.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add projects via the admin dashboard at /admin/github.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

