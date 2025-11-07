"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, Star, Code2 } from "lucide-react";
import Link from "next/link";

interface FeaturedProjectCardProps {
  project: {
    _id: string;
    id: string;
    title: string;
    description: string;
    tags?: string[];
    githubUrl?: string;
    repoAccess?: string;
    hideRepoButton?: boolean;
    demoUrl?: string;
    appUrl?: string;
    stars?: number;
    language?: string;
    type?: string;
    slug?: string;
    featured?: boolean;
  };
}

export function FeaturedProjectCard({ project }: FeaturedProjectCardProps) {
  return (
    <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 hover:border-primary/50 h-full flex flex-col">
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-blue-500 transition-all duration-500" />
      
      <CardHeader className="flex-grow">
        <div className="flex items-start justify-between gap-4 mb-2">
          <CardTitle className="text-2xl group-hover:text-primary transition-colors">
            {project.title}
          </CardTitle>
          {project.featured && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap font-medium">
              Featured
            </span>
          )}
        </div>
        <CardDescription className="text-base line-clamp-3">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.tags.slice(0, 5).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.stars !== undefined && project.stars > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{project.stars}</span>
            </div>
          )}
          {project.language && (
            <div className="flex items-center gap-1">
              <Code2 className="w-4 h-4" />
              <span>{project.language}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Repository Button - Only show if not hidden */}
          {project.githubUrl && !project.hideRepoButton && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 sm:flex-none"
            >
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                View Repo
              </a>
            </Button>
          )}

          {/* Demo/Live Site Button */}
          {(project.demoUrl || project.appUrl) && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 sm:flex-none"
            >
              <a
                href={project.demoUrl || project.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {project.appUrl ? "View Live Site" : "View Demo"}
              </a>
            </Button>
          )}

          {project.slug && project.type === "case-study" && (
            <Button
              variant="default"
              size="sm"
              asChild
              className="flex-1 sm:flex-none"
            >
              <Link href={`/work/${project.slug}`} className="flex items-center gap-2">
                View Case Study
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

