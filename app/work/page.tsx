import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllWork } from "@/lib/work";

export const metadata = {
  title: "Work",
  description: "Portfolio of projects and case studies.",
};

export default function WorkPage() {
  const projects = getAllWork();
  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Work</h1>
            <p className="text-xl text-muted-foreground">
              A collection of projects I&apos;ve built, featuring case studies and technical details.
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <Link key={project.slug} href={`/work/${project.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{project.frontmatter.year || "2025"}</span>
                      <div className="flex gap-2">
                        {project.frontmatter.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {project.frontmatter.title}
                    </CardTitle>
                    <CardDescription>{project.frontmatter.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="link" className="p-0">
                      View Case Study →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

