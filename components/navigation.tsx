"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Github, Linkedin, Mail } from "lucide-react";

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
                  <a
                    href="https://github.com/phugialy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </a>
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
                
                <ThemeToggle />
              </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
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

