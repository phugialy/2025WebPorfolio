import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "About",
  description: "Learn more about Phu Gia Ly, software engineer and web developer.",
};

const skills = [
  { category: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
  { category: "Backend", items: ["Node.js", "Convex", "API Design", "PostgreSQL"] },
  { category: "Tools", items: ["Git", "GitHub Actions", "Playwright", "Vercel"] },
  { category: "Practices", items: ["Accessibility", "Performance", "Testing", "CI/CD"] },
];

const experience = [
  {
    year: "2024",
    title: "Full-Stack Developer",
    company: "Freelance & Personal Projects",
    description: "Building modern web applications with Next.js, TypeScript, and cloud platforms. Focus on performance optimization and accessibility.",
  },
  {
    year: "2020-2024",
    title: "Software Engineer",
    company: "Various Projects",
    description: "Developed scalable web applications, implemented CI/CD pipelines, and optimized applications for Core Web Vitals.",
  },
];

const interests = [
  { icon: "⚡", title: "Performance", description: "Optimizing for speed and efficiency" },
  { icon: "♿", title: "Accessibility", description: "Building for everyone" },
  { icon: "🧪", title: "Testing", description: "Quality through automation" },
  { icon: "📚", title: "Learning", description: "Always exploring new technologies" },
];

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                About <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">Me</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Software engineer passionate about building fast, accessible, and delightful web experiences.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 pt-8 border-t">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">5+ Years</div>
                <div className="text-sm text-muted-foreground mt-1">Experience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">20+ Projects</div>
                <div className="text-sm text-muted-foreground mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">98 Score</div>
                <div className="text-sm text-muted-foreground mt-1">Lighthouse</div>
              </div>
            </div>
          </div>
        </section>

        {/* Bio Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl">Background</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-lg max-w-none">
                  <p className="text-base md:text-lg leading-relaxed">
                    I&apos;m a software engineer specializing in modern web development. I focus on
                    building high-performance, accessible applications using cutting-edge technologies
                    like Next.js, TypeScript, and Tailwind CSS.
                  </p>
                  <p className="text-base md:text-lg leading-relaxed mt-4">
                    My approach to development emphasizes clean code, thoughtful user experience, and
                    measurable performance improvements. I believe that great software is not just
                    about functionality—it&apos;s about creating experiences that users love.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Experience Timeline */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Experience</h2>
                <p className="text-lg text-muted-foreground">
                  My journey in software development
                </p>
              </div>
              
              <div className="space-y-8">
                {experience.map((item, index) => (
                  <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                          <div className="text-sm font-medium text-primary mb-1">{item.year}</div>
                          <CardTitle className="text-xl md:text-2xl">{item.title}</CardTitle>
                          <div className="text-muted-foreground mt-1">{item.company}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Skills Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Skills & Technologies</h2>
                <p className="text-lg text-muted-foreground">
                  Tools and technologies I work with
                </p>
              </div>
              
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {skills.map((skillGroup) => (
                      <div key={skillGroup.category}>
                        <h3 className="font-semibold text-lg mb-4">{skillGroup.category}</h3>
                        <div className="flex flex-wrap gap-2">
                          {skillGroup.items.map((skill) => (
                            <span
                              key={skill}
                              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Principles Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Development Principles</h2>
                <p className="text-lg text-muted-foreground">
                  The values that guide my work
                </p>
              </div>
              
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xl">⚡</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Performance First</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Every millisecond matters. I optimize for Core Web Vitals and real-world user experience.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xl">♿</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Accessibility Always</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Building for everyone means keyboard navigation, screen readers, and WCAG compliance.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xl">🔷</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Type Safety</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          TypeScript throughout catches bugs early and improves developer experience.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xl">🧪</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Testing & CI/CD</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Automated testing with Playwright ensures confidence in every deployment.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Interests Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Interests & Focus Areas</h2>
                <p className="text-lg text-muted-foreground">
                  What drives my passion for development
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {interests.map((interest, index) => (
                  <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{interest.icon}</div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{interest.title}</h3>
                          <p className="text-muted-foreground text-sm">{interest.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <Card className="bg-primary/5 border-primary/20 border-2">
                <CardContent className="py-12 text-center">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Let&apos;s Connect</h2>
                  <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                    Interested in working together? I&apos;d love to hear about your project.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Link href="/contact">
                      <Button size="lg" className="text-base px-8 h-12">
                        Get in Touch
                      </Button>
                    </Link>
                    <Link href="/work">
                      <Button variant="outline" size="lg" className="text-base px-8 h-12 border-2">
                        View My Work
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

