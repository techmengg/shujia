import { unstable_cache } from "next/cache";
import * as service from "./service";
import type { MangaDetails, MangaSummary } from "@/lib/manga/types";

export const searchSeries = unstable_cache(
  async (query: string, limit?: number): Promise<MangaSummary[]> =>
    service.searchSeries(query, { limit }),
  ["mangaupdates-search"],
  { revalidate: 300, tags: ["mangaupdates-search"] },
);

export const getSeriesSummaryById = unstable_cache(
  async (seriesId: string): Promise<MangaSummary | null> =>
    service.getSeriesSummaryById(seriesId),
  ["mangaupdates-summary-v2"],
  { revalidate: 3600, tags: ["mangaupdates-summary"] },
);

export const getSeriesDetailsById = unstable_cache(
  async (seriesId: string): Promise<MangaDetails | null> =>
    service.getSeriesDetailsById(seriesId),
  ["mangaupdates-details-v2"],
  { revalidate: 3600, tags: ["mangaupdates-details"] },
);

export const getTrendingByLanguage = unstable_cache(
  async (
    language: "ja" | "ko" | "zh",
    limit?: number,
  ): Promise<MangaSummary[]> => service.getTrendingByLanguage(language, limit),
  ["mangaupdates-trending-sfw-v2"],
  { revalidate: 1800, tags: ["mangaupdates-trending"] },
);

export const getTrending = unstable_cache(
  async (limit?: number): Promise<MangaSummary[]> => service.getTrending(limit),
  ["mangaupdates-trending-combined-sfw-v1"],
  { revalidate: 1800, tags: ["mangaupdates-trending"] },
);

export const getPopularNewTitles = unstable_cache(
  async (limit?: number): Promise<MangaSummary[]> =>
    service.getPopularNewTitles(limit),
  ["mangaupdates-popular-new-titles-sfw-v2"],
  { revalidate: 3600, tags: ["mangaupdates-popular-new-titles"] },
);

export const getRecentReleases = unstable_cache(
  async (limit?: number): Promise<MangaSummary[]> =>
    service.getRecentReleases(limit),
  ["mangaupdates-recent-releases-sfw-v2"],
  { revalidate: 300, tags: ["mangaupdates-recent-releases"] },
);

export { MangaUpdatesAPIError } from "./client";
export type { MangaDetails, MangaSummary } from "@/lib/manga/types";
