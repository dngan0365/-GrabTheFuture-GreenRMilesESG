import type { NextConfig } from "next";

// Where the Next server proxies /api/v1 requests. Locally (Docker Compose)
// this is the backend service on the internal network; on Railway set the
// BACKEND_ORIGIN build arg to the backend's public URL.
function resolveBackendOrigin(): string {
  // Docker's `ARG BACKEND_ORIGIN` with no value sets an empty string (not
  // undefined), so `??` isn't enough — fall back on empty/whitespace too.
  const raw = (process.env.BACKEND_ORIGIN ?? "").trim() || "http://backend:8000";
  // Allow setting a bare host (e.g. "foo.up.railway.app") — default to https.
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  // Strip any trailing slash so the joined path stays well-formed.
  return withScheme.replace(/\/+$/, "");
}

const BACKEND_ORIGIN = resolveBackendOrigin();

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
