"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeaturedProjectCard } from "./featured-project-card";

interface FeaturedProjectsGridProps {
  limit?: number;
  className?: string;
}

export function FeaturedProjectsGrid({ limit, className }: FeaturedProjectsGridProps) {
  const projects = useQuery(api.projects.getFeatured) || [];

  const displayProjects = limit ? projects.slice(0, limit) : projects;

  if (projects.length === 0) {
    return (
      <div className={`text-center py-12 ${className || ""}`}>
        <p className="text-muted-foreground">No featured projects available.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className || ""}`}>
      {displayProjects.map((project) => (
        <FeaturedProjectCard key={project._id} project={project} />
      ))}
    </div>
  );
}

