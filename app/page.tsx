import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { getAllPosts } from "@/lib/convex-posts";
import { FeaturedBlogStack } from "@/components/blog/featured-blog-stack";
import { FeaturedProjectsGrid } from "@/components/work/featured-projects-grid";
import { ConvexClientProvider } from "@/lib/convex-provider";

export default async function HomePage() {
  const posts = await getAllPosts();
  
  // Get first 3 posts for featured hero
  const featuredPosts = posts.slice(0, 3);

  return (
    <>
      <Navigation />
          <main className="min-h-screen">
            {/* Featured Projects - Horizontal at Top */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">Featured Projects</h2>
                  <p className="text-muted-foreground">A selection of recent work showcasing expertise</p>
                </div>
                <ConvexClientProvider>
                  <FeaturedProjectsGrid limit={3} className="grid-cols-1 md:grid-cols-3" />
                </ConvexClientProvider>
                {/* View More Projects Button */}
                <div className="mt-8 text-center">
                  <Link href="/work">
                    <Button variant="outline" size="lg" className="group gap-2 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <span className="font-medium">View All Projects</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Two-Column Section: ME (Left) + Blog (Right) */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                  {/* Left: ME Section */}
                  <div className="space-y-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Software & Automation Engineer | Web Apps · Cloud Deployment · Workflow Integration
                      </div>

                      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
                        I build <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">scalable applications and automation workflows</span> that connect frontend, backend, and cloud infrastructure.
                      </h1>

                      <p className="text-lg md:text-xl text-muted-foreground mb-8">
                        Full-stack developer specializing in Next.js, TypeScript, and performance optimization.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link href="/work">
                        <Button size="lg" className="text-base px-8 h-12 w-full sm:w-auto">
                          View My Work →
                        </Button>
                      </Link>
                      <Link href="/contact">
                        <Button variant="outline" size="lg" className="text-base px-8 h-12 border-2 w-full sm:w-auto">
                          Get Free Quote
                        </Button>
                      </Link>
                    </div>

                    <div className="flex items-center justify-center gap-8 pt-8 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">5+ Years</div>
                        <div className="text-sm text-muted-foreground mt-1">Experience</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">20+ Projects</div>
                        <div className="text-sm text-muted-foreground mt-1">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">98 Score</div>
                        <div className="text-sm text-muted-foreground mt-1">Lighthouse</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Blog Posts Stacked Vertically */}
                  {featuredPosts.length >= 3 && (
                    <ConvexClientProvider>
                      <FeaturedBlogStack posts={featuredPosts} />
                    </ConvexClientProvider>
                  )}
                </div>
              </div>
            </section>

            {/* What I Do & Technologies - Combined Side-by-Side */}
            <section className="py-12 md:py-16">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                  {/* Left: What I Do */}
                  <div>
                    <div className="mb-6">
                      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">What I Do</h2>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Full-stack development with a focus on performance, accessibility, and user experience
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-start gap-5 p-5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Frontend Development</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            Building responsive, accessible user interfaces with React, Next.js, and modern CSS frameworks.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-5 p-5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Backend Development</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            Creating scalable APIs, databases, and server-side logic with Node.js, TypeScript, and cloud platforms.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-5 p-5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Performance Optimization</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            Optimizing applications for speed, accessibility, and Core Web Vitals to deliver exceptional user experiences.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Technologies */}
                  <div>
                    <div className="mb-6">
                      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Technologies I Work With</h2>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Modern tools and frameworks for building exceptional web experiences
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Next.js", icon: "⚡" },
                        { name: "TypeScript", icon: "🔷" },
                        { name: "React", icon: "⚛️" },
                        { name: "Tailwind", icon: "🎨" },
                        { name: "Node.js", icon: "🟢" },
                        { name: "PostgreSQL", icon: "🐘" },
                        { name: "AWS", icon: "☁️" },
                        { name: "Docker", icon: "🐳" }
                      ].map((tech) => (
                        <div key={tech.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="text-xl">{tech.icon}</div>
                          <div className="text-sm font-medium text-muted-foreground">{tech.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Testimonial Section */}
        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <blockquote className="text-2xl md:text-3xl font-medium text-foreground mb-8 leading-relaxed">
                &ldquo;Phu delivered exceptional results on our project. His attention to performance optimization and clean code practices made a significant impact on our application&apos;s success.&rdquo;
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">RA</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Robert Austin</div>
                  <div className="text-sm text-muted-foreground">Senior Product Manager, TechCorp</div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Recent Activity */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-semibold mb-4">Recent Activity</h2>
              <p className="text-muted-foreground">What I&apos;ve been working on lately</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">2 hours ago</p>
                  <p className="text-foreground">Deployed new portfolio with Next.js 15 and improved performance metrics</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">1 day ago</p>
                  <p className="text-foreground">Published article on &ldquo;Building Accessible Web Applications&rdquo;</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">3 days ago</p>
                  <p className="text-foreground">Completed weather dashboard with real-time API integration</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl">Let&apos;s Work Together</CardTitle>
              <CardDescription className="text-base">
                I&apos;m always open to discussing new projects, creative ideas, or opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg">Contact Me</Button>
                </Link>
                <Link href="/guestbook">
                  <Button variant="outline" size="lg">Sign the Guestbook</Button>
                </Link>
        </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
