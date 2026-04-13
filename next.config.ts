import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pin Turbopack to this app so CSS/PostCSS (Tailwind) does not resolve a parent lockfile and read the wrong `package.json`. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      {
        source: '/settings/companies',
        destination: '/admin/companies',
        permanent: true,
      },
      {
        source: '/settings/companies/:slug/members',
        destination: '/admin/companies/:slug/members',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
