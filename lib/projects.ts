/**
 * Unified project management system
 * Supports: Case studies, GitHub repos, live apps, and simple projects
 */

export type ProjectType = "case-study" | "repository" | "live-app" | "side-project";
export type ProjectStatus = "featured" | "active" | "archived" | "in-progress";

export interface BaseProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  type: ProjectType;
  status: ProjectStatus;
  image?: string;
  featured?: boolean;
}

export interface CaseStudyProject extends BaseProject {
  type: "case-study";
  slug: string; // Links to /work/[slug]
  role?: string;
  duration?: string;
  metrics?: string[]; // ["90% faster", "10k users"]
}

export interface RepositoryProject extends BaseProject {
  type: "repository";
  githubUrl: string;
  stars?: number;
  language?: string;
  demo?: string; // Optional live demo URL
}

export interface LiveAppProject extends BaseProject {
  type: "live-app";
  appUrl: string;
  githubUrl?: string;
  screenshots?: string[];
}

export interface SideProject extends BaseProject {
  type: "side-project";
  link?: string; // Optional external link
  note?: string; // Brief note about the project
}

export type Project = CaseStudyProject | RepositoryProject | LiveAppProject | SideProject;

/**
 * All projects - centralized configuration
 */
export const projects: Project[] = [
  // Featured Case Studies
  {
    id: "portfolio-v2",
    type: "case-study",
    status: "featured",
    title: "Portfolio v2",
    description: "Modern portfolio with Next.js 15, featuring MDX blog, weather integration, and Convex backend.",
    tags: ["Next.js", "TypeScript", "Tailwind", "Convex"],
    year: "2025",
    slug: "portfolio-v2",
    role: "Full-Stack Development",
    duration: "2 weeks",
    metrics: ["Lighthouse 98", "LCP < 2.0s", "100% Accessibility"],
    featured: true,
    image: "/projects/portfolio-v2.jpg",
  },
  {
    id: "weather-dashboard",
    type: "case-study",
    status: "featured",
    title: "Weather Dashboard",
    description: "Geolocation-aware weather application with intelligent caching and rate limiting using Open-Meteo API.",
    tags: ["Next.js", "API Integration", "Geolocation", "Caching"],
    year: "2025",
    slug: "weather-dashboard",
    role: "Full-Stack Development",
    duration: "3 days",
    metrics: ["90% API reduction", "Sub-200ms response", "87% cache hit rate"],
    featured: true,
    image: "/projects/weather-dashboard.jpg",
  },
  {
    id: "auto-blogging",
    type: "case-study",
    status: "featured",
    title: "Auto-Blogging System",
    description: "Automated content curation with RSS harvesting, GitHub Actions, and daily pull request automation.",
    tags: ["GitHub Actions", "MDX", "Automation", "CI/CD"],
    year: "2025",
    slug: "auto-blogging-system",
    role: "DevOps & Automation",
    duration: "4 days",
    metrics: ["85% time saved", "100% uptime", "450+ posts discovered"],
    featured: true,
    image: "/projects/auto-blogging.jpg",
  },

  // Live Apps (examples - replace with your actual apps)
  {
    id: "weather-app-live",
    type: "live-app",
    status: "active",
    title: "Weather App (Live Demo)",
    description: "Try the weather dashboard with real-time data",
    tags: ["Demo", "Interactive"],
    year: "2025",
    appUrl: "/weather",
    featured: false,
  },

  // GitHub Repositories (examples - add your actual repos)
  // {
  //   id: "react-hooks-library",
  //   type: "repository",
  //   status: "active",
  //   title: "React Hooks Library",
  //   description: "Collection of custom React hooks for common use cases",
  //   tags: ["React", "TypeScript", "Hooks", "Library"],
  //   year: "2024",
  //   githubUrl: "https://github.com/yourusername/react-hooks",
  //   stars: 245,
  //   language: "TypeScript",
  //   demo: "https://react-hooks-demo.vercel.app",
  //   featured: false,
  // },

  // Side Projects (examples - add your experiments)
  // {
  //   id: "color-palette-generator",
  //   type: "side-project",
  //   status: "archived",
  //   title: "AI Color Palette Generator",
  //   description: "Generate beautiful color palettes using machine learning",
  //   tags: ["Python", "ML", "Design"],
  //   year: "2023",
  //   link: "https://colors.example.com",
  //   note: "Weekend experiment with OpenAI API",
  //   featured: false,
  // },
];

/**
 * Filter projects by type
 */
export function getProjectsByType(type: ProjectType): Project[] {
  return projects.filter((p) => p.type === type);
}

/**
 * Get only featured projects
 */
export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured === true);
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): Project[] {
  return projects.filter((p) => p.status === status);
}

/**
 * Get all case studies (for /work page)
 */
export function getCaseStudies(): CaseStudyProject[] {
  return projects.filter((p) => p.type === "case-study") as CaseStudyProject[];
}

/**
 * Get all repositories (for potential GitHub showcase page)
 */
export function getRepositories(): RepositoryProject[] {
  return projects.filter((p) => p.type === "repository") as RepositoryProject[];
}

/**
 * Get all live apps
 */
export function getLiveApps(): LiveAppProject[] {
  return projects.filter((p) => p.type === "live-app") as LiveAppProject[];
}

/**
 * Get project by ID
 */
export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/**
 * Type guard functions
 */
export function isCaseStudy(project: Project): project is CaseStudyProject {
  return project.type === "case-study";
}

export function isRepository(project: Project): project is RepositoryProject {
  return project.type === "repository";
}

export function isLiveApp(project: Project): project is LiveAppProject {
  return project.type === "live-app";
}

export function isSideProject(project: Project): project is SideProject {
  return project.type === "side-project";
}

