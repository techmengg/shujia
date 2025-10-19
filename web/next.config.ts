import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
        pathname: "/covers/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
