import { unstable_cache } from "next/cache";
import * as service from "./service";
import type { MangaDetails, MangaSummary } from "@/lib/mangadex/types";

export const searchSeries = unstable_cache(
  async (query: string, limit?: number): Promise<MangaSummary[]> =>
    service.searchSeries(query, { limit }),
  ["mangaupdates-search"],
  { revalidate: 300, tags: ["mangaupdates-search"] },
);

export const getSeriesSummaryById = unstable_cache(
  async (seriesId: string): Promise<MangaSummary | null> =>
    service.getSeriesSummaryById(seriesId),
  ["mangaupdates-summary"],
  { revalidate: 3600, tags: ["mangaupdates-summary"] },
);

export const getSeriesDetailsById = unstable_cache(
  async (seriesId: string): Promise<MangaDetails | null> =>
    service.getSeriesDetailsById(seriesId),
  ["mangaupdates-details"],
  { revalidate: 3600, tags: ["mangaupdates-details"] },
);

export { MangaUpdatesAPIError } from "./client";
export type { MangaDetails, MangaSummary } from "@/lib/mangadex/types";
