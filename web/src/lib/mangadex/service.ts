import { COVER_ART_BASE_URL, mangadexFetch } from "./client";
import type {
  MangaDexCollectionResponse,
  MangaDexManga,
  MangaSummary,
} from "./types";

const DEFAULT_LIMIT = 12;

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
  return `${COVER_ART_BASE_URL}/${mangaId}/${fileName}.512.jpg`;
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
    .map((record) => getPreferredLocaleText(record))
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  return {
    id,
    title:
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

export async function searchManga(
  query: string,
  options: ListOptions = {},
): Promise<MangaSummary[]> {
  if (!query.trim()) {
    return [];
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

  return response.data.map(createMangaSummary);
}

export { MangaDexAPIError } from "./client";
