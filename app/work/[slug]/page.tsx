import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllWork, getWorkBySlug } from "@/lib/work";
import { MDXRemote } from "next-mdx-remote/rsc";

export async function generateStaticParams() {
  const works = getAllWork();
  return works.map((work) => ({
    slug: work.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);

  if (!work) {
    return {
      title: "Project Not Found",
    };
  }

  return {
    title: work.frontmatter.title,
    description: work.frontmatter.description,
    openGraph: {
      title: work.frontmatter.title,
      description: work.frontmatter.description,
      type: "article",
    },
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);

  if (!work) {
    notFound();
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link href="/work">
              <Button variant="ghost" className="mb-8 -ml-2 group">
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Work
              </Button>
            </Link>

            {/* Header */}
            <header className="mb-12 pb-8 border-b">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {work.frontmatter.title}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                {work.frontmatter.description}
              </p>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {work.frontmatter.year && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Year</div>
                    <div className="font-semibold">{work.frontmatter.year}</div>
                  </div>
                )}
                {work.frontmatter.role && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Role</div>
                    <div className="font-semibold">{work.frontmatter.role}</div>
                  </div>
                )}
                {work.frontmatter.duration && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Duration</div>
                    <div className="font-semibold">{work.frontmatter.duration}</div>
                  </div>
                )}
                {work.frontmatter.tags && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Technologies</div>
                    <div className="font-semibold">{work.frontmatter.tags.length} tech</div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {work.frontmatter.tags && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {work.frontmatter.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose prose-lg prose-headings:font-display prose-headings:font-bold prose-h1:text-4xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:mb-6 prose-li:my-2 prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-muted prose-pre:border max-w-none">
              <MDXRemote source={work.content} />
            </div>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t">
              <div className="flex items-center justify-between">
                <Link href="/work">
                  <Button variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    View All Projects
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button>
                    Discuss Your Project
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Button>
                </Link>
              </div>
            </footer>
          </div>
        </article>
      </main>
    </>
  );
}

