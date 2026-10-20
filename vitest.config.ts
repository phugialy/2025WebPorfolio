import path from "node:path";
import { defineConfig } from "vitest/config";

// Resolves the "@/*" alias from tsconfig under Vitest and keeps Playwright
// specs (tests/e2e) out of the Vitest run.
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
