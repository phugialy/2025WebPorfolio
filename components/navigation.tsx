"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isDealsActive } from "@/lib/deals-core";
import { ThemeToggle } from "./theme-toggle";
import { WeatherWidget } from "./weather-widget";
import { Github, MessageCircle } from "lucide-react";

// Primary destinations shown as top-level links. Weather and Contact are
// deliberately not in this list -- Weather already has a richer, glanceable
// presence via <WeatherWidget /> next to it (a plain duplicate text link
// read as redundant), and Contact is the "Start a conversation" CTA button
// below instead of a plain nav-text link. Both routes are still real and
// reachable -- Weather via the small link beside the widget and in the
// mobile menu, Contact via the CTA -- kept out of this list only to keep
// the primary row to the content/business destinations.
const routes = [
  // The space is non-breaking so the label never wraps onto two lines in a tight nav row.
  { name: "AI News", path: "/blog", description: "AI stories and analysis" },
  { name: "Field Notes", path: "/threads", description: "Ongoing observations, one-way" },
  { name: "Resources", path: "/resources", description: "Tools worth knowing about" },
  { name: "About", path: "/about", description: "Background & skills" },
];

const secondaryRoutes = [
  { name: "Weather", path: "/weather", description: "Local weather" },
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
            className="group flex items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/phugialy-mark-light-on-dark.svg"
              alt="Phu Gia Ly"
              className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="hidden font-display text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary sm:inline">
              Phu Gia Ly
            </span>
          </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4 lg:gap-6">
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
                
                {isDealsActive() && (
                  <Link
                    href="/deals"
                    aria-current={pathname.startsWith("/deals") ? "page" : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/60 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                    </span>
                    Deals
                  </Link>
                )}

                {/* Social + secondary links */}
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
                  <Link
                    href="/weather"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Weather
                  </Link>
                </div>

                <WeatherWidget />
                <ThemeToggle />

                <Link
                  href="/contact"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  Start a conversation
                </Link>
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
            {isDealsActive() && (
              <Link
              href="/deals"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-1 flex items-center justify-between rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground"
            >
              <span>Deals</span>
              <span className="text-xs font-medium opacity-80">Holiday picks and offers</span>
            </Link>
            )}
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
            <div className="mt-2 border-t pt-2">
              {secondaryRoutes.map((route) => (
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
          </div>
        )}
      </div>
    </nav>
  );
}

