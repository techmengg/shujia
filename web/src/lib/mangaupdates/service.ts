import { MangaUpdatesAPIError, mangaupdatesFetch } from "./client";
import type {
  SeriesModelSearchV1,
  SeriesModelV1,
  SeriesSearchRequestV1,
  SeriesSearchResponseV1,
  MangaSummary,
  MangaDetails,
  MangaContributor,
  MangaStatistics,
} from "./types";

const DEFAULT_LIMIT = 12;

function normalizeText(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function buildCoverImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  // MangaUpdates provides full URLs - proxy them through our cover endpoint
  const params = new URLSearchParams({
    url: imageUrl,
  });
  return `/api/images/cover?${params.toString()}`;
}

function createMangaSummary(series: SeriesModelSearchV1): MangaSummary {
  const {
    series_id,
    title,
    url,
    description,
    image,
    type,
    year,
    genres,
    latest_chapter,
  } = series;

  // Extract alt titles from series if available (MangaUpdates doesn't have explicit alt titles in search)
  const altTitles: string[] = [];

  // Extract genres as tags
  const tags = genres?.map((g) => g.genre).filter(Boolean) || [];

  return {
    id: String(series_id),
    title: normalizeText(title) ?? "Untitled series",
    altTitles,
    description: normalizeText(description),
    status: undefined, // Not available in search results
    year: year ? Number.parseInt(year, 10) : undefined,
    contentRating: undefined, // MangaUpdates doesn't have explicit content ratings
    demographic: type ?? undefined,
    latestChapter: latest_chapter ? String(latest_chapter) : undefined,
    languages: [], // MangaUpdates doesn't expose this in search results
    originalLanguage: type ?? undefined, // Use type as a proxy for origin
    tags,
    coverImage: buildCoverImageUrl(image?.url?.thumb || image?.url?.original),
    url: url || `https://www.mangaupdates.com/series/${series_id}`,
  };
}

type OrderField = "score" | "title" | "rank" | "rating" | "year";

type OrderDirection = "asc" | "desc";

interface ListOptions {
  limit?: number;
  type?: string;
  contentRatings?: string[];
  includedTags?: string[];
  includedTagsMode?: "AND" | "OR";
  orderField?: OrderField;
  orderDirection?: OrderDirection;
}

async function fetchSeriesList(
  options: ListOptions = {},
): Promise<MangaSummary[]> {
  const {
    limit = DEFAULT_LIMIT,
    type,
    includedTags,
    orderField = "score",
  } = options;

  const searchRequest: SeriesSearchRequestV1 = {
    perpage: limit,
    page: 1,
    orderby: orderField,
    ...(type
      ? {
          type: [type],
        }
      : {}),
    ...(includedTags && includedTags.length > 0
      ? {
          genre: includedTags,
        }
      : {}),
  };

  console.log("[MangaUpdates] Fetching series list with:", searchRequest);

  const response = await mangaupdatesFetch<SeriesSearchResponseV1>(
    "/series/search",
    {
      method: "POST",
      body: JSON.stringify(searchRequest),
      next: {
        revalidate: 60 * 30, // 30 minutes
      },
    },
  );

  console.log(`[MangaUpdates] Got ${response.results?.length || 0} results from ${response.total_hits} total hits`);

  return response.results.map((result) => createMangaSummary(result.record));
}

export async function getTrendingManga(
  limit = 8,
): Promise<MangaSummary[]> {
  return fetchSeriesList({ limit, orderField: "score" });
}

export async function getTrendingByOriginalLanguage(
  originalLanguage: string,
  limit = 8,
): Promise<MangaSummary[]> {
  // Map common language codes to MangaUpdates types
  const typeMap: Record<string, string> = {
    ja: "Manga",
    ko: "Manhwa",
    zh: "Manhua",
  };

  const type = typeMap[originalLanguage] || "Manga";
  return fetchSeriesList({ limit, type, orderField: "score" });
}

export async function getRecentPopularByOriginalLanguage(
  originalLanguage: string,
  limit = 8,
): Promise<MangaSummary[]> {
  const typeMap: Record<string, string> = {
    ja: "Manga",
    ko: "Manhwa",
    zh: "Manhua",
  };

  const type = typeMap[originalLanguage] || "Manga";
  return fetchSeriesList({ limit, type, orderField: "rating" });
}

export async function getPopularNewTitles(
  limit = 18,
): Promise<MangaSummary[]> {
  return fetchSeriesList({ limit, orderField: "score" });
}

export async function getDemographicHighlights(
  demographic: string,
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchSeriesList({
    type: demographic,
    limit,
    orderField: "score",
  });
}

export async function getNewcomerSpotlight(
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchSeriesList({
    limit,
    orderField: "year",
  });
}

export async function getLatestActivityShowcase(
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchSeriesList({
    limit,
    orderField: "score",
  });
}

export async function getRecentlyUpdatedManga(
  limit = 20,
  offset = 0,
): Promise<MangaSummary[]> {
  const page = Math.floor(offset / limit) + 1;

  const searchRequest: SeriesSearchRequestV1 = {
    perpage: limit,
    page,
    orderby: "score", // MangaUpdates doesn't have a direct "recently updated" sort
  };

  const response = await mangaupdatesFetch<SeriesSearchResponseV1>(
    "/series/search",
    {
      method: "POST",
      body: JSON.stringify(searchRequest),
      next: {
        revalidate: 60 * 5, // 5 minutes
      },
    },
  );

  return response.results.map((result) => createMangaSummary(result.record));
}

function createMangaDetails(
  series: SeriesModelV1,
): MangaDetails {
  const base = createMangaSummary(series);

  const contributors: MangaContributor[] =
    series.authors?.map((author) => ({
      id: String(author.author_id ?? 0),
      name: normalizeText(author.name) ?? "Unknown",
      role: author.type === "Author" ? "author" : "artist",
    })) || [];

  const uniqueContributors = new Map<string, MangaContributor>();
  for (const contributor of contributors) {
    const key = `${contributor.role}-${contributor.id}`;
    if (!uniqueContributors.has(key)) {
      uniqueContributors.set(key, contributor);
    }
  }

  const tagsDetailed = series.genres?.map((g) => g.genre).filter(Boolean) || [];

  // Build statistics from rank data
  const statistics: MangaStatistics | undefined = series.rank
    ? {
        follows: series.rank.lists?.reading,
        rating: series.bayesian_rating
          ? {
              average: series.rating_votes ? series.bayesian_rating : undefined,
              bayesian: series.bayesian_rating,
            }
          : undefined,
      }
    : undefined;

  return {
    ...base,
    descriptionFull: normalizeText(series.description),
    lastChapter: series.latest_chapter ? String(series.latest_chapter) : undefined,
    lastVolume: undefined, // MangaUpdates doesn't expose this clearly
    contributors: Array.from(uniqueContributors.values()),
    scanlationGroups: [], // MangaUpdates doesn't have scanlation groups in series data
    statistics,
    tagsDetailed,
    availableLanguages: [], // Not available in MangaUpdates API
  };
}

export async function getMangaDetails(
  mangaId: string,
): Promise<MangaDetails | null> {
  if (!mangaId.trim()) {
    return null;
  }

  // Check if this is an old MangaDex UUID format (not compatible with MangaUpdates)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaId);
  if (isUUID) {
    console.warn(`Skipping MangaDex UUID ${mangaId} - incompatible with MangaUpdates API`);
    return null;
  }

  // MangaUpdates expects numeric IDs
  if (!/^\d+$/.test(mangaId)) {
    console.warn(`Invalid MangaUpdates ID format: ${mangaId}`);
    return null;
  }

  try {
    const response = await mangaupdatesFetch<SeriesModelV1>(
      `/series/${mangaId}`,
      {
        cache: "no-store",
      },
    );

    if (!response) {
      return null;
    }

    return createMangaDetails(response);
  } catch (error) {
    if (error instanceof MangaUpdatesAPIError) {
      if (error.status === 404) {
        return null;
      }
      console.warn(`Manga details failed for ${mangaId}: ${error.message}`);
      return null;
    }

    console.warn(`Manga details unexpected error for ${mangaId}:`, error);
    return null;
  }
}

export async function getMangaSummaryById(
  mangaId: string,
): Promise<MangaSummary | null> {
  if (!mangaId.trim()) {
    return null;
  }

  // Check if this is an old MangaDex UUID format (not compatible with MangaUpdates)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaId);
  if (isUUID) {
    console.warn(`Skipping MangaDex UUID ${mangaId} - incompatible with MangaUpdates API`);
    return null;
  }

  // MangaUpdates expects numeric IDs
  if (!/^\d+$/.test(mangaId)) {
    console.warn(`Invalid MangaUpdates ID format: ${mangaId}`);
    return null;
  }

  // Simple in-memory cache for summaries to reduce repeat lookups during imports
  const globalAny = globalThis as unknown as {
    __mu_summary_cache__?: Map<string, { ts: number; value: MangaSummary | null }>;
  };
  const SUMMARY_TTL_MS = 1000 * 60 * 60 * 24; // 24h
  if (!globalAny.__mu_summary_cache__) {
    globalAny.__mu_summary_cache__ = new Map();
  }
  const summaryCache = globalAny.__mu_summary_cache__!;
  const cached = summaryCache.get(mangaId);
  if (cached && Date.now() - cached.ts < SUMMARY_TTL_MS) {
    return cached.value;
  }

  try {
    const response = await mangaupdatesFetch<SeriesModelV1>(
      `/series/${mangaId}`,
      {
        cache: "no-store",
      },
    );

    if (!response) {
      summaryCache.set(mangaId, { ts: Date.now(), value: null });
      return null;
    }

    const out = createMangaSummary(response);
    summaryCache.set(mangaId, { ts: Date.now(), value: out });
    return out;
  } catch (error) {
    if (error instanceof MangaUpdatesAPIError) {
      if (error.status === 404) {
        summaryCache.set(mangaId, { ts: Date.now(), value: null });
        return null;
      }
      console.warn(`Manga summary failed for ${mangaId}: ${error.message}`);
      summaryCache.set(mangaId, { ts: Date.now(), value: null });
      return null;
    }

    console.warn(`Manga summary unexpected error for ${mangaId}:`, error);
    summaryCache.set(mangaId, { ts: Date.now(), value: null });
    return null;
  }
}

export async function searchManga(
  query: string,
  options: ListOptions = {},
): Promise<MangaSummary[]> {
  if (!query.trim()) {
    return [];
  }

  // Cache top search results to speed up repeated resolves
  const globalAny = globalThis as unknown as {
    __mu_search_cache__?: Map<string, { ts: number; value: MangaSummary[] }>;
  };
  const SEARCH_TTL_MS = 1000 * 60 * 60 * 12; // 12h
  if (!globalAny.__mu_search_cache__) {
    globalAny.__mu_search_cache__ = new Map();
  }
  const searchCache = globalAny.__mu_search_cache__!;
  const key = `${query.trim().toLowerCase()}::${options.limit ?? DEFAULT_LIMIT}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < SEARCH_TTL_MS) {
    return cached.value;
  }

  const searchRequest: SeriesSearchRequestV1 = {
    search: query.trim(),
    stype: "title",
    perpage: options.limit ?? DEFAULT_LIMIT,
    page: 1,
    orderby: "score",
  };

  const response = await mangaupdatesFetch<SeriesSearchResponseV1>(
    "/series/search",
    {
      method: "POST",
      body: JSON.stringify(searchRequest),
      next: {
        revalidate: 60 * 5, // 5 minutes
      },
    },
  );

  const value = response.results.map((result) => createMangaSummary(result.record));
  searchCache.set(key, { ts: Date.now(), value });
  return value;
}

export { MangaUpdatesAPIError } from "./client";

