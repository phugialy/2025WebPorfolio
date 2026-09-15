import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next*/**",
      "out/**",
      "build/**",
      "convex/_generated/**",
      "next-env.d.ts",
      // One-off CommonJS migration script, run directly via `node`, never
      // part of the app build -- not worth converting to ESM just to
      // satisfy a rule meant for app code.
      "scripts/_migrate_supabase_data.js",
    ],
  },
];

export default eslintConfig;
