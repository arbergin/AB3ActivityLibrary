import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Merge this property into the project's existing Next.js configuration.
  // It ensures the ffmpeg-static executable is included with the MP4 API route.
  outputFileTracingIncludes: {
    "/api/animation/mp4": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
