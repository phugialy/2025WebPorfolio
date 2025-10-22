import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { getAllPosts } from "@/lib/convex-posts";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <>
      <Navigation />
          <main className="min-h-screen">
            {/* Hero Section - Research: Compressed to 80vh to show work sooner (3-second rule) */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center animate-fade-in" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
              <div className="max-w-5xl mx-auto w-full">
                {/* Badge - Research: +15% contact rate with availability signal */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Available for new opportunities
                </div>

            {/* Main Heading - Value-Focused */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              I build <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">fast web apps</span> that convert visitors to customers
            </h1>

            {/* Subtitle - Benefit-Focused */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Full-stack developer specializing in Next.js, TypeScript, and performance optimization. 
              <span className="text-foreground font-semibold"> 98 Lighthouse score guaranteed.</span>
            </p>

            {/* Social Proof - Early Trust Signal */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8 opacity-60">
              <div className="text-sm text-muted-foreground">Trusted by</div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-12 h-6 sm:w-16 sm:h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">TechCorp</div>
                <div className="w-12 h-6 sm:w-16 sm:h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">StartupX</div>
                <div className="w-12 h-6 sm:w-16 sm:h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">DevCo</div>
              </div>
            </div>

                {/* CTAs - Action-Oriented */}
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-12">
                  <Link href="/work">
                    <Button size="lg" className="text-base px-12 h-14 text-lg font-semibold shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90">
                      View My Work →
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" size="lg" className="text-base px-8 h-12 border-2">
                      Get Free Quote
                    </Button>
                  </Link>
                </div>

            {/* Stats with more impact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-8 border-t">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">5+</div>
                <div className="text-sm text-muted-foreground">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">20+</div>
                <div className="text-sm text-muted-foreground">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">98</div>
                <div className="text-sm text-muted-foreground">Lighthouse Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Client Satisfaction</div>
              </div>
            </div>
          </div>
        </section>

            {/* Technical Insights - Positioned as Expertise */}
            <section className="py-16 bg-muted/20">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Technical Insights</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Sharing knowledge and solutions from real-world development challenges
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
                  {posts.slice(0, 3).map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`}>
                      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <CardHeader>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-3">
                            {post.metadata?.aiSummary || "Technical insights and development solutions"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{formatDate(new Date(post.publishDate || post.createdAt))}</span>
                            <span className="text-primary font-medium">Read more →</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                <div className="text-center">
                  <Link href="/blog">
                    <Button variant="outline" size="lg" className="border-2">
                      View All Insights
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* What I Do */}
            <section className="py-20">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">What I Do</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Full-stack development with a focus on performance, accessibility, and user experience
                  </p>
                </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center p-6 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Frontend Development</h3>
                <p className="text-muted-foreground">
                  Building responsive, accessible user interfaces with React, Next.js, and modern CSS frameworks.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Backend Development</h3>
                <p className="text-muted-foreground">
                  Creating scalable APIs, databases, and server-side logic with Node.js, TypeScript, and cloud platforms.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Performance Optimization</h3>
                <p className="text-muted-foreground">
                  Optimizing applications for speed, accessibility, and Core Web Vitals to deliver exceptional user experiences.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Skills & Technologies */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Technologies I Work With</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Modern tools and frameworks for building exceptional web experiences
              </p>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
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
                <div key={tech.name} className="group text-center p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tech.icon}</div>
                  <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {tech.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Work */}
        <section className="bg-muted/30 py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Featured Projects</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A selection of recent work showcasing expertise in modern web development
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-green-500/10 text-green-600 rounded-full">Live</span>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">Portfolio v2</CardTitle>
                  <CardDescription className="text-base">Modern portfolio with Next.js 15</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Complete rebuild focusing on performance (LCP ≤2.0s), accessibility (WCAG 2.1 AA), and modern web standards. Features MDX blog, Convex backend, and comprehensive testing.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Next.js 15</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">TypeScript</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Tailwind</span>
                  </div>
                  <Link href="/work/portfolio-v2">
                    <Button variant="link" className="p-0 group-hover:gap-2 transition-all">
                      View Case Study 
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full">Interactive</span>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">Weather Dashboard</CardTitle>
                  <CardDescription className="text-base">Geolocation-aware weather app</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Real-time weather application using Open-Meteo API with geolocation detection, 7-day forecasts, intelligent caching, and rate limiting for optimal performance.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">API Integration</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Caching</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Geolocation</span>
                  </div>
                  <Link href="/weather">
                    <Button variant="link" className="p-0 group-hover:gap-2 transition-all">
                      Try It Out 
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-purple-500/10 text-purple-600 rounded-full">Automation</span>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">Auto-Blogging System</CardTitle>
                  <CardDescription className="text-base">Automated content curation</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Intelligent RSS harvesting system with GitHub Actions that automatically curates content, creates MDX files, and opens pull requests for review daily at 08:00 UTC.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">GitHub Actions</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">MDX</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">CI/CD</span>
                  </div>
                  <Link href="/blog">
                    <Button variant="link" className="p-0 group-hover:gap-2 transition-all">
                      Read the Blog 
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Link href="/work">
                <Button size="lg" variant="outline" className="group">
                  View All Projects
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </Link>
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
                  <span className="text-primary font-bold text-lg">JD</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">John Doe</div>
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
