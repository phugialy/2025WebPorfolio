import path from "node:path";
import { defineConfig } from "vitest/config";

// Resolves the "@/*" alias from tsconfig under Vitest and keeps Playwright
// specs (tests/e2e) out of the Vitest run.
export default defineConfig({
  // Next compiles JSX itself; this lets component tests render without importing React.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/.next/**"],
  },
});
