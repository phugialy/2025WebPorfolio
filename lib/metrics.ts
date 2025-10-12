/**
 * Performance Metrics & Targets
 * 
 * Core Web Vitals targets for this portfolio:
 * - LCP (Largest Contentful Paint): ≤ 2.0s
 * - TTI (Time to Interactive): ≤ 3.0s
 * - CLS (Cumulative Layout Shift): ≤ 0.05
 * - FID (First Input Delay): ≤ 100ms
 * - INP (Interaction to Next Paint): ≤ 200ms
 * 
 * Lighthouse targets:
 * - Performance: ≥ 95
 * - Accessibility: ≥ 95
 * - Best Practices: ≥ 95
 * - SEO: ≥ 95
 * 
 * Bundle size targets:
 * - Route JS: ≤ 180kb gzipped
 * - CSS: ≤ 30kb gzipped
 * - Images: WebP/AVIF, lazy loaded, responsive
 */

export const PERFORMANCE_TARGETS = {
  lcp: 2000, // ms
  tti: 3000, // ms
  cls: 0.05,
  fid: 100, // ms
  inp: 200, // ms
  lighthouse: 95,
  routeJs: 180 * 1024, // bytes (gzipped)
  css: 30 * 1024, // bytes (gzipped)
} as const;

export const CACHE_DURATIONS = {
  weather: 600, // 10 minutes
  staticAssets: 31536000, // 1 year
  dynamicContent: 3600, // 1 hour
  rss: 43200, // 12 hours
} as const;

export const RATE_LIMITS = {
  contact: { max: 5, window: 60000 }, // 5 per minute
  guestbook: { max: 3, window: 60000 }, // 3 per minute
  weather: { max: 30, window: 60000 }, // 30 per minute
} as const;

