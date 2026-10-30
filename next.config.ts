import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";

/* Written once per Docker build (see Dockerfile), read again by `next start`, so both agree. */
const deploymentId = existsSync(".build-id") ? readFileSync(".build-id", "utf8").trim() : undefined;

/* Every screen is personal and depends on the session, so pages render per request.
   Security headers apply to all routes. */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  deploymentId,
  /* Pages you just visited reopen from the browser for a short while; chats poll on their own. */
  experimental: { serverActions: { bodySizeLimit: "600mb" }, staleTimes: { dynamic: 15, static: 300 } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
