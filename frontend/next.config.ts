import type { NextConfig } from "next";

// Where the Next server proxies /api/v1 requests. Locally (Docker Compose)
// this is the backend service on the internal network; on Railway set the
// BACKEND_ORIGIN build arg to the backend's public URL.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://backend:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
