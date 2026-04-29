import type { MetadataRoute } from "next";

import {
  getPopularNewTitles,
  getRecentReleases,
  getTrendingByLanguage,
} from "@/lib/mangaupdates/service-cached";
import { prisma } from "@/lib/prisma";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://shujia.dev").replace(
  /\/$/,
  "",
);

// 24h between Googlebot crawls of this file is plenty — manga catalog moves
// at upstream's pace, not ours. Vercel will also edge-cache the response.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/roadmap`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/users`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
  ];

  // Pull a broad mix of comics: trending in each language + popular new + recent
  // releases. Dedupe by ID. We can't enumerate the whole MangaUpdates catalog
  // (it's millions), but seeding Google with the active surface area gets it
  // crawling internal links to discover the rest.
  const mangaEntries: MetadataRoute.Sitemap = [];
  try {
    const [popular, recent, trendingJa, trendingKo, trendingZh] = await Promise.all([
      getPopularNewTitles(60).catch(() => []),
      getRecentReleases(60).catch(() => []),
      getTrendingByLanguage("ja", 30).catch(() => []),
      getTrendingByLanguage("ko", 30).catch(() => []),
      getTrendingByLanguage("zh", 30).catch(() => []),
    ]);
    const seen = new Set<string>();
    for (const item of [
      ...popular,
      ...recent,
      ...trendingJa,
      ...trendingKo,
      ...trendingZh,
    ]) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      mangaEntries.push({
        url: `${SITE_URL}/manga/${encodeURIComponent(item.id)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If MU is down, ship the static portion anyway.
  }

  // Plus every series anyone in the community is actively tracking — these
  // are the pages most likely to attract real interest and to have user
  // ratings + reviews (which is unique content Google will rank for).
  const trackedEntries: MetadataRoute.Sitemap = [];
  try {
    const tracked = await prisma.readingListEntry.findMany({
      select: { provider: true, mangaId: true, updatedAt: true },
      distinct: ["provider", "mangaId"],
      orderBy: { updatedAt: "desc" },
      take: 1000,
    });
    const seenTracked = new Set<string>();
    for (const entry of tracked) {
      const key = `${entry.provider}/${entry.mangaId}`;
      if (seenTracked.has(key)) continue;
      seenTracked.add(key);
      trackedEntries.push({
        url: `${SITE_URL}/manga/${encodeURIComponent(entry.mangaId)}`,
        lastModified: entry.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // If DB is unreachable, skip this section silently.
  }

  // Public user profiles — only include users with a public footprint
  // (tracked at least one series, or written a review). Drives long-tail
  // discovery via "shujia <username>" searches and gives reviewer credit.
  const profileEntries: MetadataRoute.Sitemap = [];
  try {
    const profiles = await prisma.user.findMany({
      where: {
        OR: [
          { readingListEntries: { some: {} } },
          { reviews: { some: {} } },
        ],
      },
      select: { username: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    for (const u of profiles) {
      profileEntries.push({
        url: `${SITE_URL}/${encodeURIComponent(u.username.toLowerCase())}`,
        lastModified: u.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch {
    // ignore
  }

  return [...staticEntries, ...mangaEntries, ...trackedEntries, ...profileEntries];
}
