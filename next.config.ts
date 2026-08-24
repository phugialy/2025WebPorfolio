import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    mdxRs: true, // Enable Rust-based MDX compiler for faster builds
  },
  // Fix turbopack root directory warning
  turbopack: {
    root: process.cwd(),
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {},
});

export default withMDX(nextConfig);
