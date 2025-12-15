/**
 * Cached versions of MangaUpdates service functions
 * These wrap the original functions with Next.js caching for optimal performance
 */

import { unstable_cache } from "next/cache";
import * as service from "./service";
import type { MangaSummary, MangaDetails } from "./types";

/**
 * Cache trending manga by language
 * Revalidates every 5 minutes
 */
export const getRecentPopularByOriginalLanguage = unstable_cache(
  async (language: string, limit: number): Promise<MangaSummary[]> => {
    return service.getRecentPopularByOriginalLanguage(language, limit);
  },
  ["trending-by-language"],
  {
    revalidate: 300, // 5 minutes
    tags: ["mangaupdates-trending"],
  }
);

/**
 * Cache popular new titles
 * Revalidates every 10 minutes (changes less frequently)
 */
export const getPopularNewTitles = unstable_cache(
  async (limit: number): Promise<MangaSummary[]> => {
    return service.getPopularNewTitles(limit);
  },
  ["popular-new-titles"],
  {
    revalidate: 600, // 10 minutes
    tags: ["mangaupdates-popular"],
  }
);

/**
 * Cache demographic highlights
 * Revalidates every 10 minutes
 */
export const getDemographicHighlights = unstable_cache(
  async (demographic: string, limit: number): Promise<MangaSummary[]> => {
    return service.getDemographicHighlights(demographic, limit);
  },
  ["demographic-highlights"],
  {
    revalidate: 600, // 10 minutes
    tags: ["mangaupdates-demographic"],
  }
);

/**
 * Cache recently updated manga
 * Revalidates every 3 minutes (changes frequently)
 */
export const getRecentlyUpdatedManga = unstable_cache(
  async (limit: number, offset: number = 0): Promise<MangaSummary[]> => {
    return service.getRecentlyUpdatedManga(limit, offset);
  },
  ["recently-updated"],
  {
    revalidate: 180, // 3 minutes
    tags: ["mangaupdates-recent"],
  }
);

/**
 * Cache manga details
 * Revalidates every hour (relatively static)
 */
export const getMangaDetails = unstable_cache(
  async (mangaId: string): Promise<MangaDetails | null> => {
    return service.getMangaDetails(mangaId);
  },
  ["manga-details"],
  {
    revalidate: 3600, // 1 hour
    tags: ["mangaupdates-details"],
  }
);

/**
 * Cache manga summary
 * Revalidates every hour (relatively static)
 */
export const getMangaSummaryById = unstable_cache(
  async (mangaId: string): Promise<MangaSummary | null> => {
    return service.getMangaSummaryById(mangaId);
  },
  ["manga-summary"],
  {
    revalidate: 3600, // 1 hour
    tags: ["mangaupdates-summary"],
  }
);

/**
 * Cache search results
 * Revalidates every 5 minutes
 */
export const searchManga = unstable_cache(
  async (query: string, limit?: number): Promise<MangaSummary[]> => {
    return service.searchManga(query, { limit });
  },
  ["manga-search"],
  {
    revalidate: 300, // 5 minutes
    tags: ["mangaupdates-search"],
  }
);

// Re-export types
export type { MangaSummary, MangaDetails } from "./types";
export { MangaUpdatesAPIError } from "./client";

