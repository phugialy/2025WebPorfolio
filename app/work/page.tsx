import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllWork } from "@/lib/work";
import { 
  projects,
  getFeaturedProjects, 
  getCaseStudies,
  getRepositories,
  getLiveApps,
  type Project,
  isCaseStudy,
  isRepository,
  isLiveApp,
  isSideProject,
} from "@/lib/projects";
import { ExternalLink, Github, Play } from "lucide-react";

export const metadata = {
  title: "Work",
  description: "Portfolio of projects, case studies, and open-source contributions.",
};

export default function WorkPage() {
  const featured = getFeaturedProjects();
  const caseStudies = getCaseStudies();
  const repositories = getRepositories();
  const liveApps = getLiveApps();

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-16">
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">My Work</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Featured projects, case studies, and open-source contributions showcasing expertise in modern web development.
            </p>
          </header>

          {/* Featured Projects */}
          {featured.length > 0 && (
            <section className="mb-24">
              <h2 className="text-3xl font-bold mb-8">Featured Projects</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featured.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* Case Studies */}
          {caseStudies.length > 0 && caseStudies.length > featured.filter(p => isCaseStudy(p)).length && (
            <section className="mb-24">
              <h2 className="text-3xl font-bold mb-8">Case Studies</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {caseStudies.filter(cs => !cs.featured).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* GitHub Repositories */}
          {repositories.length > 0 && (
            <section className="mb-24">
              <h2 className="text-3xl font-bold mb-8">Open Source</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repositories.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* Live Apps */}
          {liveApps.length > 0 && (
            <section className="mb-24">
              <h2 className="text-3xl font-bold mb-8">Live Demos</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveApps.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  // Determine the link and icon based on project type
  const getProjectLink = () => {
    if (isCaseStudy(project)) return `/work/${project.slug}`;
    if (isRepository(project)) return project.githubUrl;
    if (isLiveApp(project)) return project.appUrl;
    if (isSideProject(project)) return project.link || "#";
    return "#";
  };

  const getProjectIcon = () => {
    if (isRepository(project)) return <Github className="w-5 h-5" />;
    if (isLiveApp(project)) return <Play className="w-5 h-5" />;
    if (isSideProject(project) && project.link) return <ExternalLink className="w-5 h-5" />;
    return null;
  };

  const getLinkText = () => {
    if (isCaseStudy(project)) return "View Case Study →";
    if (isRepository(project)) return "View Repository →";
    if (isLiveApp(project)) return "Try Live Demo →";
    if (isSideProject(project)) return "Learn More →";
    return "View →";
  };

  const isExternal = !isCaseStudy(project);
  const CardWrapper = isExternal ? "a" : Link;
  const cardProps = isExternal 
    ? { href: getProjectLink(), target: "_blank", rel: "noopener noreferrer" }
    : { href: getProjectLink() };

  return (
    <CardWrapper {...cardProps}>
      <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
        {/* Gradient Header */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-blue-500 transition-all duration-500" />
        
        <CardHeader className="flex-grow pb-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm text-muted-foreground">{project.year}</span>
            <div className="flex items-center gap-2">
              {/* Project Type Badge */}
              {isCaseStudy(project) && <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full">Case Study</span>}
              {isRepository(project) && <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-600 rounded-full">Open Source</span>}
              {isLiveApp(project) && <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-full">Live</span>}
              {getProjectIcon()}
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
          {isCaseStudy(project) && project.metrics && (
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
          {isRepository(project) && project.stars && (
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold">{project.stars}</span>
              {project.language && (
                <span className="text-sm text-muted-foreground ml-2">• {project.language}</span>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <Button variant="link" className="p-0 group-hover:gap-2 transition-all">
            {getLinkText()}
          </Button>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
