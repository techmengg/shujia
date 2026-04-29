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
  // Anime News Network — covers og:image thumbnails on the home news rail.
  // Wildcard handles subdomains (cdn-images, www, etc.).
  {
    protocol: "https",
    hostname: "**.animenewsnetwork.com",
    pathname: "/**",
  },
  // Reddit preview/thumbnail hosts — used by the manhwa news rail.
  {
    protocol: "https",
    hostname: "i.redd.it",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "external-preview.redd.it",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "preview.redd.it",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "b.thumbs.redditmedia.com",
    pathname: "/**",
  },
  // MangaBaka — covers for the home "New releases" rail. Wildcard covers
  // both api.* and any cdn.* subdomains they may use.
  {
    protocol: "https",
    hostname: "**.mangabaka.dev",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "mangabaka.dev",
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
