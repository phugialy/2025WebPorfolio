# Deployment Guide

## Prerequisites

1. **Node.js 20+** and **pnpm** installed
2. **Convex Account** for backend (free tier available)
3. **GitHub Account** for CI/CD
4. **Vercel Account** (optional, for deployment)

## Local Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Convex (Backend)
```bash
# Initialize Convex
pnpm convex dev

# Follow the prompts to:
# - Login or create account
# - Create a new project
# - This will generate convex/_generated files
```

### 3. Configure Environment Variables
Create `.env.local`:
```bash
# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# GitHub API (for repository sync)
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_USERNAME=phugialy  # Optional: defaults to this username
```

**To get a GitHub token:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `public_repo` scope
3. Copy and add to `.env.local`

### 4. Run Development Server
```bash
pnpm dev
```

Visit http://localhost:3000

## Production Deployment

### Option 1: Deploy to Vercel (Recommended)

1. **Connect to GitHub:**
   ```bash
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `NEXT_PUBLIC_CONVEX_URL`
     - `CONVEX_DEPLOYMENT`
     - `NEXT_PUBLIC_SITE_URL`

3. **Deploy:**
   - Vercel will auto-build and deploy
   - Set up custom domain at www.phugialy.com

### Option 2: Self-Hosted

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Post-Deployment

### 1. Configure Convex Production
```bash
# Deploy Convex backend to production
pnpm convex deploy --prod
```

### 2. Update Environment Variables
Update production environment with Convex production URL

### 3. Test Features
- [ ] Homepage loads
- [ ] Blog posts display
- [ ] Weather feature works
- [ ] Contact form submits (after Convex setup)
- [ ] Guestbook posts (after Convex setup)
- [ ] Theme toggle works
- [ ] All pages accessible

### 4. Enable GitHub Actions
Auto-blogging will run daily at 08:00 UTC automatically once deployed to GitHub.

## Performance Optimization

### Lighthouse Targets
Run Lighthouse audits:
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://www.phugialy.com --view
```

**Targets:**
- Performance: ≥ 95
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 95

### Core Web Vitals
- LCP ≤ 2.0s
- TTI ≤ 3.0s  
- CLS ≤ 0.05

## Monitoring

1. **Vercel Analytics** (if using Vercel)
2. **Convex Dashboard** for backend metrics
3. **GitHub Actions** for CI/CD status

## Troubleshooting

### Build Fails
- Check Node version: `node --version` (should be 20+)
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `pnpm install`

### Convex Issues
- Ensure Convex is initialized: `pnpm convex dev`
- Check environment variables are set
- Verify deployment URL in Convex dashboard

### Type Errors
- Run type check: `pnpm typecheck`
- Regenerate Convex types: `pnpm convex dev` (generates files)

## Maintenance

### Update Dependencies
```bash
pnpm update
```

### Run Tests
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# E2E tests
pnpm e2e
```

### RSS Harvest (Manual)
```bash
pnpm rss:harvest
```

Auto-blogging runs via GitHub Actions daily, but you can manually trigger it:
- Go to GitHub → Actions → Auto-Blog workflow
- Click "Run workflow"

