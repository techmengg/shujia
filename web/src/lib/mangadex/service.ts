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

interface ListOptions {
  limit?: number;
  originalLanguage?: string;
}

async function fetchTrendingTitles(
  options: ListOptions = {},
): Promise<MangaSummary[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const originalLanguage = options.originalLanguage;

  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit,
      offset: 0,
      "includes[]": ["cover_art"],
      "order[followedCount]": "desc",
      "contentRating[]": ["safe", "suggestive"],
      hasAvailableChapters: true,
      ...(originalLanguage
        ? {
            "originalLanguage[]": originalLanguage,
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

export async function getRecentlyUpdatedManga(
  limit = 20,
): Promise<MangaSummary[]> {
  const response = await mangadexFetch<
    MangaDexCollectionResponse<MangaDexManga>
  >("/manga", {
    searchParams: {
      limit,
      offset: 0,
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
