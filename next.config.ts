import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "178.105.14.11",
        port: "29000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "29000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
