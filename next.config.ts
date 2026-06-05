import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta los TTF de marca en la función serverless del PDF para que
  // @react-pdf/renderer los lea del filesystem en runtime (sin fetch remoto).
  outputFileTracingIncludes: {
    '/api/plans/[id]/pdf': ['./src/components/pdf/fonts/**'],
  },
};

export default nextConfig;
