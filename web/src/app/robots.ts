import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://shujia.dev").replace(
  /\/$/,
  "",
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep auth and per-user write surfaces out of the index entirely.
        // /api is data plumbing, not content. /reading-list is a redirect shim
        // post-migration, the canonical URL is /<username>/reading-list.
        disallow: [
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/settings/",
          "/reading-list",
          "/reading-list/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
