"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Play, ExternalLink, Lock, Eye } from "lucide-react";
import { useState } from "react";
import { RepoAccessDialog } from "./repo-access-dialog";

interface Project {
  _id: string;
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
  hideRepoButton?: boolean;
  stars?: number;
  language?: string;
  demoUrl?: string;
  appUrl?: string;
  link?: string;
  note?: string;
}

interface EnhancedProjectCardProps {
  project: Project;
}

export function EnhancedProjectCard({ project }: EnhancedProjectCardProps) {
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);

  const getProjectTypeBadge = () => {
    switch (project.type) {
      case "case-study":
        return { label: "Case Study", className: "bg-blue-500/10 text-blue-600" };
      case "repository":
        return { label: "Repository", className: "bg-purple-500/10 text-purple-600" };
      case "live-app":
        return { label: "Live", className: "bg-green-500/10 text-green-600" };
      case "side-project":
        return { label: "Project", className: "bg-orange-500/10 text-orange-600" };
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (project.status) {
      case "featured":
        return { label: "Featured", className: "bg-primary/10 text-primary" };
      case "in-progress":
        return { label: "In Progress", className: "bg-yellow-500/10 text-yellow-600" };
      case "archived":
        return { label: "Archived", className: "bg-gray-500/10 text-gray-600" };
      default:
        return null;
    }
  };

  const handleRepoClick = (e: React.MouseEvent) => {
    if (project.repoAccess === "request-access") {
      e.preventDefault();
      setRepoDialogOpen(true);
    }
  };

  const typeBadge = getProjectTypeBadge();
  const statusBadge = getStatusBadge();

  return (
    <>
      <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
        {/* Gradient Header */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-blue-500 transition-all duration-500" />

        <CardHeader className="flex-grow pb-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm text-muted-foreground">{project.year}</span>
            <div className="flex items-center gap-2">
              {project.featured && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  Featured
                </span>
              )}
              {typeBadge && (
                <span className={`text-xs px-2 py-1 rounded-full ${typeBadge.className}`}>
                  {typeBadge.label}
                </span>
              )}
              {statusBadge && (
                <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
          </div>

          <CardTitle className="text-2xl group-hover:text-primary transition-colors">
            {project.title}
          </CardTitle>
          <CardDescription className="text-base">{project.description}</CardDescription>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 4 && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                +{project.tags.length - 4} more
              </span>
            )}
          </div>

          {/* Metrics for Case Studies */}
          {project.type === "case-study" && project.metrics && project.metrics.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              {project.metrics.slice(0, 3).map((metric, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {metric}
                </div>
              ))}
            </div>
          )}

          {/* Stars for Repositories */}
          {project.type === "repository" && (project.stars || project.language) && (
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              {project.stars !== undefined && (
                <>
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-semibold">{project.stars}</span>
                </>
              )}
              {project.language && (
                <span className="text-sm text-muted-foreground ml-2">• {project.language}</span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Case Study Link */}
            {project.type === "case-study" && project.slug && (
              <Link href={`/work/${project.slug}`}>
                <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">
                  <Eye className="w-4 h-4 mr-2" />
                  View Case Study
                </Button>
              </Link>
            )}

            {/* Demo Button */}
            {(project.demoUrl || project.appUrl) && (
              <a
                href={project.demoUrl || project.appUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">
                  <Play className="w-4 h-4 mr-2" />
                  View Demo
                </Button>
              </a>
            )}

            {/* Repository Button - Only show if not hidden */}
            {project.githubUrl && !project.hideRepoButton && (
              <>
                {project.repoAccess === "public" ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleRepoClick}
                  >
                    <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">
                      <Github className="w-4 h-4 mr-2" />
                      View Repo
                    </Button>
                  </a>
                ) : project.repoAccess === "request-access" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                    onClick={() => setRepoDialogOpen(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Request Access
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                    disabled
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Private
                  </Button>
                )}
              </>
            )}

            {/* External Link for Side Projects */}
            {project.type === "side-project" && project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repository Access Dialog */}
      {project.repoAccess === "request-access" && (
        <RepoAccessDialog
          open={repoDialogOpen}
          onOpenChange={setRepoDialogOpen}
          projectId={project.id}
          projectTitle={project.title}
        />
      )}
    </>
  );
}

