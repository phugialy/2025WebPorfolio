"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { WeatherWidget } from "./weather-widget";
import { Github, Linkedin, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const routes = [
  { name: "Work", path: "/work", description: "Portfolio & projects" },
  { name: "Blog", path: "/blog", description: "Writing & thoughts" },
  { name: "Weather", path: "/weather", description: "Local weather" },
  { name: "About", path: "/about", description: "Background & skills" },
  { name: "Contact", path: "/contact", description: "Get in touch" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [githubDropdownOpen, setGithubDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const requestAccess = useMutation(api.projects.requestRepoAccess);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setGithubDropdownOpen(false);
      }
    };

    if (githubDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [githubDropdownOpen]);

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await requestAccess({
        projectId: "github-profile",
        email: email.trim(),
        name: name.trim(),
        company: company.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        window.open("https://github.com/phugialy", "_blank", "noopener,noreferrer");
        setGithubDropdownOpen(false);
        setEmail("");
        setName("");
        setCompany("");
        setSubmitted(false);
      }, 1000);
    } catch (error) {
      console.error("Error requesting access:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent group-hover:from-primary group-hover:to-foreground transition-all duration-300">
              Phu Gia Ly
            </span>
          </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                {routes.map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    className={cn(
                      "group relative text-sm font-medium transition-all duration-200",
                      pathname === route.path
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {route.name}
                    <span
                      className={cn(
                        "absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-200",
                        pathname === route.path ? "w-full" : "w-0 group-hover:w-full"
                      )}
                    />
                  </Link>
                ))}
                
                {/* Social Links - Research shows +25% credibility */}
                <div className="flex items-center gap-3 ml-2 pl-6 border-l">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setGithubDropdownOpen(!githubDropdownOpen)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </button>
                    {githubDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg p-4 z-[100]">
                        {submitted ? (
                          <div className="text-center py-4">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                              <svg
                                className="w-6 h-6 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold mb-1">Redirecting to GitHub...</p>
                            <p className="text-xs text-muted-foreground">You&apos;ll be redirected shortly.</p>
                          </div>
                        ) : (
                          <form onSubmit={handleGithubSubmit} className="space-y-3">
                            <div className="space-y-1.5">
                              <label htmlFor="nav-name" className="text-xs font-medium">
                                Name <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="nav-name"
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label htmlFor="nav-company" className="text-xs font-medium">
                                Company (Optional)
                              </label>
                              <Input
                                id="nav-company"
                                type="text"
                                placeholder="Your Company"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                disabled={isSubmitting}
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label htmlFor="nav-email" className="text-xs font-medium">
                                Email <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="nav-email"
                                type="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setGithubDropdownOpen(false);
                                  setEmail("");
                                  setName("");
                                  setCompany("");
                                }}
                                disabled={isSubmitting}
                                className="flex-1 h-8 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !email.trim() || !name.trim()}
                                className="flex-1 h-8 text-xs"
                              >
                                {isSubmitting ? "Redirecting..." : "View Repository"}
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                  <a
                    href="https://linkedin.com/in/phugialy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="mailto:contact@phugialy.com"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
                
                <WeatherWidget />
                <ThemeToggle />
              </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
            <WeatherWidget />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block py-3 px-4 rounded-lg transition-colors",
                  pathname === route.path
                    ? "bg-primary/10 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="font-medium">{route.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{route.description}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

