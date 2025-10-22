/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // Disable turbopack for build to avoid module resolution issues
      rules: {},
    },
  },
  // Ensure proper module resolution
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
