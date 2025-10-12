import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const projects: Record<string, { title: string; description: string; content: string }> = {
  "portfolio-v2": {
    title: "Portfolio v2",
    description: "Modern portfolio website built with Next.js 15",
    content: `
# Portfolio v2

## Overview
A complete rebuild of my portfolio website focusing on performance, accessibility, and modern web standards.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Convex
- **Content**: MDX
- **Testing**: Playwright, Vitest
- **CI/CD**: GitHub Actions

## Key Features
- **Performance**: LCP ≤2.0s, Lighthouse ≥95
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark Mode**: System-aware theme switching
- **MDX Blog**: Rich content with embedded components
- **Auto-Blogging**: RSS harvesting with GitHub Actions
- **Weather Integration**: Geolocation-aware weather data

## Challenges & Solutions
### Challenge: Performance Budget
Keeping bundle size under 180kb while maintaining rich functionality.

**Solution**: Implemented code splitting, lazy loading, and optimized images.

### Challenge: Accessibility
Ensuring full keyboard navigation and screen reader support.

**Solution**: Focus management, ARIA labels, and semantic HTML throughout.

## Results
- Lighthouse Performance: 98/100
- Accessibility Score: 100/100
- SEO Score: 100/100
- First Contentful Paint: 0.8s
- Time to Interactive: 1.2s
    `,
  },
};

export async function generateStaticParams() {
  return Object.keys(projects).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects[slug];
  
  if (!project) {
    return { title: "Project Not Found" };
  }

  return {
    title: project.title,
    description: project.description,
  };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects[slug];

  if (!project) {
    notFound();
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Link href="/work">
              <Button variant="ghost" className="mb-4">
                ← Back to Work
              </Button>
            </Link>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {project.title}
            </h1>
            <p className="text-xl text-muted-foreground">{project.description}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            {project.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i}>{line.substring(2)}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={i}>{line.substring(3)}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={i}>{line.substring(4)}</h3>;
              } else if (line.startsWith('- ')) {
                return <li key={i}>{line.substring(2)}</li>;
              } else if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
              } else if (line.trim() === '') {
                return <br key={i} />;
              } else {
                return <p key={i}>{line}</p>;
              }
            })}
          </div>
        </article>
      </main>
    </>
  );
}

