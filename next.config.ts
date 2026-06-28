import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

if (process.env.NODE_ENV === "development") {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
}

export default nextConfig;
