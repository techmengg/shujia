import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "uploads.mangadex.org",
    pathname: "/covers/**",
  },
  {
    protocol: "https",
    hostname: "mangadex.org",
    pathname: "/covers/**",
  },
  {
    protocol: "https",
    hostname: "uploads-cdn.mangadex.org",
    pathname: "/covers/**",
  },
  {
    protocol: "https",
    hostname: "api.dicebear.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "placehold.co",
    pathname: "/**",
  },
];

const blobBaseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

if (blobBaseUrl) {
  try {
    const { hostname } = new URL(blobBaseUrl);
    remotePatterns.push({
      protocol: "https",
      hostname,
      pathname: "/**",
    });
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_BLOB_BASE_URL provided:", error);
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // Reduce the number of transformed variants while keeping UX crisp
    deviceSizes: [360, 640, 1024],
    imageSizes: [48, 96, 160, 256],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

export default nextConfig;
