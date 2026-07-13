import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Code2,
  FileText,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { getAllPosts } from "@/lib/articles";
import { FeaturedProjectsGrid } from "@/components/work/featured-projects-grid";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { RoleSliderPanel } from "@/components/role-slider-panel";
import { ArticleNewsCard } from "@/components/blog/article-news-card";

const focusAreas = [
  {
    icon: Code2,
    title: "Full-stack web apps",
    description:
      "Next.js, TypeScript, APIs, databases, and deployment paths that are built to be maintained.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description:
      "Small, practical automations that remove repeated admin work without hiding the review step.",
  },
  {
    icon: Bot,
    title: "Applied AI systems",
    description:
      "AI-assisted drafting, coding, and operations workflows with clear scope, checks, and human judgment.",
  },
];

export default async function HomePage() {
  const posts = await getAllPosts();
  const featuredPosts = posts.slice(0, 5);
  const leadPost = featuredPosts[0];
  const secondaryPosts = featuredPosts.slice(1);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <RoleSliderPanel />
        </section>

        {featuredPosts.length > 0 && (
          <section className="border-y bg-muted/20">
            <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-primary">
                      <FileText className="h-4 w-4" />
                      Practical AI & Automation Notes
                    </div>
                    <h2 className="font-display text-3xl font-bold">Recent writing</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Short reads on AI tools, coding workflows, and automation decisions from a builder&apos;s point of view.
                    </p>
                  </div>
                  <Link href="/blog">
                    <Button variant="outline" size="sm">
                      All Posts
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  {leadPost && <ArticleNewsCard post={leadPost} variant="home-lead" />}
                  {secondaryPosts.length > 0 && (
                    <div className="grid content-start gap-5">
                      {secondaryPosts.map((post) => (
                        <ArticleNewsCard key={post._id} post={post} variant="home-compact" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display text-3xl font-bold">How I help</h2>
              <p className="mt-2 text-muted-foreground">
                The useful work is usually a focused system: one workflow, one interface, one clear path to production.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {focusAreas.map((area) => {
                const Icon = area.icon;
                return (
                  <Card key={area.title} className="h-full">
                    <CardHeader>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-xl">{area.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {area.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-3xl font-bold">Featured work</h2>
                <p className="mt-2 text-muted-foreground">
                  Projects that show the shape of the systems I build.
                </p>
              </div>
              <Link href="/work">
                <Button variant="outline" size="sm">
                  View Work
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <ConvexClientProvider>
              <FeaturedProjectsGrid limit={3} className="grid-cols-1 md:grid-cols-3" />
            </ConvexClientProvider>
          </div>
        </section>

        <section className="border-t">
          <div className="container mx-auto px-4 py-14 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-bold">Have a workflow worth tightening?</h2>
              <p className="mt-3 text-muted-foreground">
                I can help turn a repeated process, rough product idea, or AI-assisted workflow into a clearer software path.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/contact">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start a Conversation
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    About Me
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
