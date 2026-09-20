import path from "node:path";
import { defineConfig } from "vitest/config";

// Two real gaps this closes, both independently flagged during the
// social-media-manager-agent build (by three separate agent runs, plus
// this file's own test needing it directly): without this file, `@/*`
// path aliases (defined in tsconfig.json, used throughout this project's
// lib/ and now social-agent/-adjacent code) don't resolve under Vitest --
// only under tsc/Next.js's own bundler resolution -- and `vitest run`
// picks up `tests/e2e/**/*.spec.ts` (Playwright specs) with no config
// telling it not to, since Playwright specs use `test`/`expect` from
// `@playwright/test`, which collides with Vitest's own globals.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/.next/**"],
  },
});
