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

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">About Me</h1>
            <p className="text-xl text-muted-foreground">
              Software engineer passionate about building fast, accessible, and delightful web experiences.
            </p>
          </header>

          <div className="space-y-8">
            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle>Background</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-lg max-w-none">
                <p>
                  I&apos;m a software engineer specializing in modern web development. I focus on
                  building high-performance, accessible applications using cutting-edge technologies
                  like Next.js, TypeScript, and Tailwind CSS.
                </p>
                <p>
                  My approach to development emphasizes clean code, thoughtful user experience, and
                  measurable performance improvements. I believe that great software is not just
                  about functionality—it&apos;s about creating experiences that users love.
                </p>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills & Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {skills.map((skillGroup) => (
                    <div key={skillGroup.category}>
                      <h3 className="font-semibold mb-3">{skillGroup.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {skillGroup.items.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm"
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

            {/* Principles */}
            <Card>
              <CardHeader>
                <CardTitle>Development Principles</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <div>
                      <strong>Performance First</strong>
                      <p className="text-muted-foreground">
                        Every millisecond matters. I optimize for Core Web Vitals and real-world user experience.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <div>
                      <strong>Accessibility Always</strong>
                      <p className="text-muted-foreground">
                        Building for everyone means keyboard navigation, screen readers, and WCAG compliance.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <div>
                      <strong>Type Safety</strong>
                      <p className="text-muted-foreground">
                        TypeScript throughout catches bugs early and improves developer experience.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <div>
                      <strong>Testing & CI/CD</strong>
                      <p className="text-muted-foreground">
                        Automated testing with Playwright ensures confidence in every deployment.
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-8 text-center">
                <h2 className="font-display text-2xl font-bold mb-4">Let&apos;s Connect</h2>
                <p className="text-muted-foreground mb-6">
                  Interested in working together? I&apos;d love to hear about your project.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg">Get in Touch</Button>
                </Link>
                <Link href="/work">
                  <Button variant="outline" size="lg">View My Work</Button>
                </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

