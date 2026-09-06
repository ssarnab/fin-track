import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a build run into a scratch directory (NEXT_DIST_DIR=.next-check
  // next build) instead of clobbering the .next that a running dev server
  // holds open — doing both at once corrupts the dev chunks.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [
      // Google profile photos
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
