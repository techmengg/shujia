import { Buffer } from "node:buffer";
import { COVER_ART_BASE_URL, MangaDexAPIError, mangadexFetch } from "./client";
import type {
  MangaDexCollectionResponse,
  MangaDexManga,
  MangaDexStatisticsResponse,
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

  try {
    if (/[ÃÂ]/.test(trimmed)) {
      const decoded = Buffer.from(trimmed, "latin1").toString("utf8").trim();
      if (decoded) {
        return decoded;
      }
    }
  } catch {
    // ignore decoding failures
  }

  return trimmed;
}

function getPreferredLocaleText(
  textRecord: Record<string, string>,
  preferredLocales: string[] = ["en", "en-us", "en-gb"],
): string | undefined {
  for (const locale of preferredLocales) {
    const value = textRecord[locale] ?? textRecord[locale.toLowerCase()];
    if (value) return value;
  }

  const firstValue = Object.values(textRecord).find(Boolean);
  return firstValue?.trim() ? firstValue : undefined;
}

function buildCoverArtUrl(mangaId: string, fileName: string): string {
  // Route through our proxy to avoid hotlink restrictions and handle fallbacks.
  const params = new URLSearchParams({
    mangaId,
    file: fileName,
    size: "256",
  });
  return `/api/images/cover?${params.toString()}`;
}

function createMangaSummary(manga: MangaDexManga): MangaSummary {
  const { attributes, id, relationships } = manga;

  const coverRelationship = relationships.find(
    (relationship) => relationship.type === "cover_art",
  );

  const coverFileName =
    coverRelationship?.attributes &&
    "fileName" in coverRelationship.attributes
      ? (coverRelationship.attributes.fileName as string)
      : undefined;

  const altTitles = attributes.altTitles
    .map((record) => getPreferredLocaleText(record, ["en", "en-us", "en-gb"]) || getPreferredLocaleText(record))
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  return {
    id,
    title:
      getPreferredLocaleText(attributes.title, ["en", "en-us", "en-gb"]) ??
      // search English across all alt titles first
      (attributes.altTitles.length
        ? (attributes.altTitles
            .map((rec) => getPreferredLocaleText(rec, ["en", "en-us", "en-gb"]))
            .find((v) => Boolean(v)) as string | undefined)
        : undefined) ??
      // then fall back to any locale title
      getPreferredLocaleText(attributes.title) ??
      getPreferredLocaleText(attributes.altTitles[0] ?? {}) ??
      "Untitled series",
    altTitles,
    description: getPreferredLocaleText(attributes.description),
    status: attributes.status ?? undefined,
    year: attributes.year ?? undefined,
    contentRating: attributes.contentRating ?? undefined,
    demographic: attributes.publicationDemographic ?? undefined,
    latestChapter: attributes.latestUploadedChapter ?? undefined,
    languages: attributes.availableTranslatedLanguages ?? [],
    originalLanguage: attributes.originalLanguage ?? undefined,
    tags: attributes.tags
      .map((tag) => getPreferredLocaleText(tag.attributes.name))
      .filter((value): value is string => Boolean(value)),
    coverImage:
      coverFileName !== undefined
        ? buildCoverArtUrl(id, coverFileName)
        : undefined,
    url: `https://mangadex.org/title/${id}`,
  };
}

type OrderField =
  | "followedCount"
  | "createdAt"
  | "latestUploadedChapter"
  | "updatedAt"
  | "year";

type OrderDirection = "asc" | "desc";

interface ListOptions {
  limit?: number;
  originalLanguage?: string;
  publicationDemographic?: string;
  contentRatings?: string[];
  includedTags?: string[];
  includedTagsMode?: "AND" | "OR";
  orderField?: OrderField;
  orderDirection?: OrderDirection;
}

async function fetchTrendingTitles(
  options: ListOptions = {},
): Promise<MangaSummary[]> {
  const {
    limit = DEFAULT_LIMIT,
    originalLanguage,
    publicationDemographic,
    contentRatings,
    includedTags,
    includedTagsMode,
    orderField = "followedCount",
    orderDirection = "desc",
  } = options;

  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit,
      offset: 0,
      "includes[]": ["cover_art"],
      [`order[${orderField}]`]: orderDirection,
      "contentRating[]": contentRatings ?? ["safe", "suggestive"],
      hasAvailableChapters: true,
      ...(originalLanguage
        ? {
            "originalLanguage[]": originalLanguage,
          }
        : {}),
      ...(publicationDemographic
        ? {
            "publicationDemographic[]": publicationDemographic,
          }
        : {}),
      ...(includedTags && includedTags.length > 0
        ? {
            "includedTags[]": includedTags,
            includedTagsMode: includedTagsMode ?? "AND",
          }
        : {}),
    },
    next: {
      revalidate: 60 * 30,
    },
  });

  return response.data.map(createMangaSummary);
}

export async function getTrendingManga(
  limit = 8,
): Promise<MangaSummary[]> {
  return fetchTrendingTitles({ limit });
}

export async function getTrendingByOriginalLanguage(
  originalLanguage: string,
  limit = 8,
): Promise<MangaSummary[]> {
  return fetchTrendingTitles({ originalLanguage, limit });
}

export async function getRecentPopularByOriginalLanguage(
  originalLanguage: string,
  limit = 8,
): Promise<MangaSummary[]> {
  // "Recent popular" interpreted as titles with latest uploaded chapters recently,
  // filtered by original language so it surfaces active/popular releases per region.
  return fetchTrendingTitles({
    originalLanguage,
    limit,
    orderField: "latestUploadedChapter",
    orderDirection: "desc",
  });
}

export async function getPopularNewTitles(
  limit = 18,
): Promise<MangaSummary[]> {
  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit,
      offset: 0,
      "includes[]": ["cover_art"],
      "contentRating[]": ["safe", "suggestive"],
      "order[createdAt]": "desc",
      "order[followedCount]": "desc",
      hasAvailableChapters: true,
    },
    next: {
      revalidate: 60 * 30,
    },
  });

  return response.data.map(createMangaSummary);
}

export async function getDemographicHighlights(
  demographic: string,
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchTrendingTitles({
    publicationDemographic: demographic,
    limit,
  });
}

export async function getNewcomerSpotlight(
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchTrendingTitles({
    limit,
    orderField: "createdAt",
  });
}

export async function getLatestActivityShowcase(
  limit = 12,
): Promise<MangaSummary[]> {
  return fetchTrendingTitles({
    limit,
    orderField: "latestUploadedChapter",
  });
}

export async function getRecentlyUpdatedManga(
  limit = 20,
  offset = 0,
): Promise<MangaSummary[]> {
  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit,
      offset,
      "includes[]": ["cover_art"],
      "order[updatedAt]": "desc",
      "contentRating[]": ["safe", "suggestive"],
      hasAvailableChapters: true,
    },
    next: {
      revalidate: 60 * 5,
    },
  });

  return response.data.map(createMangaSummary);
}

async function getMangaStatistics(
  mangaId: string,
): Promise<MangaStatistics | null> {
  try {
    const response = await mangadexFetch<MangaDexStatisticsResponse>(
      `/statistics/manga/${mangaId}`,
      {
        cache: "no-store",
      },
    );

    const stats = response.statistics?.[mangaId];

    if (!stats) {
      return null;
    }

    return {
      follows: stats.follows ?? undefined,
      rating: stats.rating
        ? {
            average: stats.rating.average ?? undefined,
            bayesian: stats.rating.bayesian ?? undefined,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof MangaDexAPIError && error.status === 404) {
      return null;
    }

    console.warn(`Failed to load statistics for manga ${mangaId}`, error);
    return null;
  }
}

function createMangaDetails(
  manga: MangaDexManga,
  statistics: MangaStatistics | null,
): MangaDetails {
  const base = createMangaSummary(manga);
  const { attributes, relationships } = manga;

  const contributors: MangaContributor[] = relationships
    .filter(
      (relationship) =>
        relationship.type === "author" || relationship.type === "artist",
    )
    .map((relationship) => {
      const attributesObj =
        relationship.attributes && typeof relationship.attributes === "object"
          ? (relationship.attributes as Record<string, unknown>)
          : null;

      const name =
        attributesObj && typeof attributesObj.name === "string"
          ? normalizeText(attributesObj.name as string) ?? "Unknown"
          : "Unknown";

      const role =
        relationship.type === "author" ? "author" : ("artist" as const);

      return {
        id: relationship.id,
        name,
        role,
      };
    });

  const uniqueContributors = new Map<string, MangaContributor>();
  for (const contributor of contributors) {
    const key = `${contributor.role}-${contributor.id}`;
    if (!uniqueContributors.has(key)) {
      uniqueContributors.set(key, contributor);
    }
  }

  const scanlationGroupsRaw = relationships
    .filter((relationship) => relationship.type === "scanlation_group")
    .map((relationship) => {
      const attributesObj =
        relationship.attributes && typeof relationship.attributes === "object"
          ? (relationship.attributes as Record<string, unknown>)
          : null;

      const name =
        attributesObj && typeof attributesObj.name === "string"
          ? normalizeText(attributesObj.name as string) ?? "Unknown"
          : "Unknown";

      return {
        id: relationship.id,
        name,
      };
    });

  const uniqueScanlationGroups = new Map<string, { id: string; name: string }>();
  for (const group of scanlationGroupsRaw) {
    if (!uniqueScanlationGroups.has(group.id)) {
      uniqueScanlationGroups.set(group.id, group);
    }
  }

  const tagsDetailed = attributes.tags
    .map((tag) => getPreferredLocaleText(tag.attributes.name))
    .filter((value): value is string => Boolean(value));

  return {
    ...base,
    descriptionFull: getPreferredLocaleText(attributes.description),
    lastChapter: attributes.lastChapter ?? undefined,
    lastVolume: attributes.lastVolume ?? undefined,
    contributors: Array.from(uniqueContributors.values()),
    scanlationGroups: Array.from(uniqueScanlationGroups.values()),
    statistics: statistics ?? undefined,
    tagsDetailed,
    availableLanguages: attributes.availableTranslatedLanguages ?? [],
  };
}

export async function getMangaDetails(
  mangaId: string,
): Promise<MangaDetails | null> {
  if (!mangaId.trim()) {
    return null;
  }

  try {
    const [detailResponse, statistics] = await Promise.all([
      mangadexFetch<{ data: MangaDexManga }>(`/manga/${mangaId}`, {
        searchParams: {
          "includes[]": ["cover_art", "author", "artist", "scanlation_group"],
        },
        cache: "no-store",
      }),
      getMangaStatistics(mangaId),
    ]);

    if (!detailResponse?.data) {
      return null;
    }

    return createMangaDetails(detailResponse.data, statistics);
  } catch (error) {
    if (error instanceof MangaDexAPIError) {
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

  // Simple in-memory cache for summaries to reduce repeat lookups during imports
  const globalAny = globalThis as unknown as {
    __md_summary_cache__?: Map<string, { ts: number; value: MangaSummary | null }>;
  };
  const SUMMARY_TTL_MS = 1000 * 60 * 60 * 24; // 24h
  if (!globalAny.__md_summary_cache__) {
    globalAny.__md_summary_cache__ = new Map();
  }
  const summaryCache = globalAny.__md_summary_cache__!;
  const cached = summaryCache.get(mangaId);
  if (cached && Date.now() - cached.ts < SUMMARY_TTL_MS) {
    return cached.value;
  }

  try {
    const response = await mangadexFetch<{ data: MangaDexManga }>(
      `/manga/${mangaId}`,
      {
        searchParams: {
          "includes[]": ["cover_art"],
        },
        cache: "no-store",
      },
    );

    if (!response?.data) {
      summaryCache.set(mangaId, { ts: Date.now(), value: null });
      return null;
    }

    const out = createMangaSummary(response.data);
    summaryCache.set(mangaId, { ts: Date.now(), value: out });
    return out;
  } catch (error) {
    if (error instanceof MangaDexAPIError) {
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

  // Cache top-1 search results to speed up repeated resolves
  const globalAny = globalThis as unknown as {
    __md_search_cache__?: Map<string, { ts: number; value: MangaSummary[] }>;
  };
  const SEARCH_TTL_MS = 1000 * 60 * 60 * 12; // 12h
  if (!globalAny.__md_search_cache__) {
    globalAny.__md_search_cache__ = new Map();
  }
  const searchCache = globalAny.__md_search_cache__!;
  const key = `${query.trim().toLowerCase()}::${options.limit ?? DEFAULT_LIMIT}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < SEARCH_TTL_MS) {
    return cached.value;
  }

  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit: options.limit ?? DEFAULT_LIMIT,
      title: query.trim(),
      "includes[]": ["cover_art"],
      "contentRating[]": ["safe", "suggestive"],
      hasAvailableChapters: true,
      order: undefined,
      "order[latestUploadedChapter]": "desc",
    },
    next: {
      revalidate: 60 * 5,
    },
  });

  const value = response.data.map(createMangaSummary);
  searchCache.set(key, { ts: Date.now(), value });
  return value;
}

export { MangaDexAPIError } from "./client";
