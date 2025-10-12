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
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="py-20 text-center animate-fade-in">
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Hi, I&apos;m{" "}
            <span className="text-primary relative">
              Phu Gia Ly
              <span className="absolute bottom-0 left-0 w-full h-1 bg-primary/30 animate-slide-up" />
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Software Engineer building modern web experiences with focus on performance, accessibility, and user delight.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/work">
              <Button size="lg">View My Work</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">Get in Touch</Button>
            </Link>
          </div>
        </section>

        {/* Featured Work */}
        <section className="py-16">
          <h2 className="font-display text-3xl font-semibold mb-8">Featured Work</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Portfolio v2</CardTitle>
                <CardDescription>Modern portfolio with Next.js 15</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A complete rebuild focusing on performance, accessibility, and modern web standards.
                </p>
                <Link href="/work/portfolio-v2">
                  <Button variant="link" className="mt-4 p-0">View Case Study →</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Weather Dashboard</CardTitle>
                <CardDescription>Geolocation-aware weather app</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Real-time weather data with Open-Meteo API, featuring caching and rate limiting.
                </p>
                <Link href="/weather">
                  <Button variant="link" className="mt-4 p-0">Try It Out →</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Auto-Blogging System</CardTitle>
                <CardDescription>Automated content curation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Daily RSS harvesting with GitHub Actions, creating PRs for new content.
                </p>
                <Link href="/blog">
                  <Button variant="link" className="mt-4 p-0">Read the Blog →</Button>
                </Link>
              </CardContent>
            </Card>
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
