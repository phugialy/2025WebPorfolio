# Phu Gia Ly — Portfolio v2

Modern portfolio website built with Next.js 15, featuring a blog, weather integration, and dynamic content management.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Convex
- **Content**: MDX
- **Testing**: Playwright, Vitest
- **CI/CD**: GitHub Actions

## 🏗️ Architecture

```
/app                  # Next.js App Router pages
  /(site)            # Main site layout group
  /api               # API routes (weather, etc.)
  /blog              # Blog pages & dynamic routes
  /work              # Portfolio case studies
  /weather           # Weather feature
  /contact           # Contact form
  /guestbook         # Guestbook feature
/components          # React components
  /ui                # shadcn/ui components
/lib                 # Utilities & helpers
/content             # MDX content
  /blog              # Published blog posts
  /inbox             # Auto-harvested drafts
  /work              # Case studies
/scripts             # Build & automation scripts
/convex              # Convex backend functions
```

## 📊 Performance Targets

- **LCP**: ≤ 2.0s
- **TTI**: ≤ 3.0s
- **CLS**: ≤ 0.05
- **Lighthouse**: ≥ 95 (mobile & desktop)
- **Route JS**: ≤ 180kb gzipped

## 🎨 Design Language

- **Typography**: Inter (UI) + Newsreader (display)
- **Colors**: Dark theme (#0B0B0C bg, #E5E7EB fg, #3B82F6 accent)
- **Spacing**: Roomy, consistent scale
- **Motion**: Subtle (0.25–0.4s), respects prefers-reduced-motion

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test       # Unit tests
pnpm e2e        # E2E tests

# Harvest RSS feeds
pnpm rss:harvest
```

## 🔒 Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

## 📝 Features

- **Blog**: MDX-powered with auto-blogging via RSS harvest
- **Weather**: Geolocation-aware weather with Open-Meteo API
- **Contact**: Form with honeypot & rate limiting
- **Guestbook**: Public comments with moderation
- **Work**: Portfolio case studies with filtering
- **Dark/Light**: System-aware theme switching

## 🚢 Deployment

This site is deployed on Vercel at [www.phugialy.com](https://www.phugialy.com)

## 📄 License

MIT © Phu Gia Ly
