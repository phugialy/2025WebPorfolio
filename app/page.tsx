import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { getFeaturedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export default function HomePage() {
  const featuredPosts = getFeaturedPosts(3);

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

            {/* Main Heading */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-tight">
              Building Digital
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Experiences
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 leading-relaxed">
              Full-stack software engineer crafting high-performance web applications
            </p>
            <p className="text-base sm:text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-12">
              Specializing in Next.js, TypeScript, and modern web technologies with a passion for accessibility, performance optimization, and delightful user experiences.
            </p>

                {/* CTAs - Research: Single primary, subtle secondary (+20% clicks) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-16">
                  <Link href="/work">
                    <Button size="lg" className="text-base px-10 h-14 text-lg font-semibold shadow-lg hover:shadow-xl">
                      View Case Studies →
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="ghost" size="lg" className="text-base px-6 h-12">
                      or Get in Touch
                    </Button>
                  </Link>
                </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">5+</div>
                <div className="text-sm text-muted-foreground">Years Experience</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">20+</div>
                <div className="text-sm text-muted-foreground">Projects Completed</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Client Satisfaction</div>
              </div>
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

        {/* Latest Blog Posts */}
        {featuredPosts.length > 0 && (
          <section className="py-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-display text-3xl font-semibold">Latest from the Blog</h2>
              <Link href="/blog">
                <Button variant="ghost">View All →</Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Card key={post.slug} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{post.frontmatter.title}</CardTitle>
                    <CardDescription>{formatDate(post.frontmatter.date)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {post.frontmatter.summary}
                    </p>
                    <Link href={`/blog/${post.slug}`}>
                      <Button variant="link" className="p-0">Read More →</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

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
