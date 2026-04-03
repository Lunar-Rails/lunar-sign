import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
