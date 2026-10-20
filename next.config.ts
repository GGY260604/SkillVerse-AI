import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Internationalization Plugin Setup
// Bind server request configuration handler located in lib i18n directory.
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

// Next.js Application Configuration
// Configure Turbopack, Tailwind CSS loaders, caching, and experimental feedback options.
const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

