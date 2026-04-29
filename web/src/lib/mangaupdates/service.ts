import { MangaUpdatesAPIError, mangaupdatesFetch } from "./client";
import type {
  MangaUpdatesReleaseResponse,
  MangaUpdatesSearchRequest,
  MangaUpdatesSearchResponse,
  MangaUpdatesSeriesRecord,
  MangaUpdatesSeriesType,
} from "./types";
import type {
  MangaContributor,
  MangaDetails,
  MangaSummary,
} from "@/lib/manga/types";

const DEFAULT_LIMIT = 12;

function originalLanguageFromType(type?: MangaUpdatesSeriesType): string | undefined {
  switch (type) {
    case "Manga":
      return "ja";
    case "Manhwa":
      return "ko";
    case "Manhua":
      return "zh";
    case "OEL":
      return "en";
    case "French":
      return "fr";
    case "Spanish":
      return "es";
    case "German":
      return "de";
    case "Indonesian":
      return "id";
    case "Filipino":
      return "tl";
    case "Thai":
      return "th";
    case "Vietnamese":
      return "vi";
    default:
      return undefined;
  }
}

function parseYear(raw?: string): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/\d{4}/);
  if (!match) return undefined;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : undefined;
}

function combineStatus(status?: string, completed?: boolean): string | undefined {
  if (completed && !status) return "Completed";
  if (completed && status && !/complete/i.test(status)) return `${status} (Completed)`;
  return status ?? undefined;
}

function buildTags(
  record: Pick<MangaUpdatesSeriesRecord, "genres" | "categories">,
): string[] {
  const fromGenres = (record.genres ?? []).map((g) => g.genre).filter(Boolean);
  const fromCategories = (record.categories ?? [])
    .map((c) => c.category)
    .filter(Boolean);
  return Array.from(new Set<string>([...fromGenres, ...fromCategories]));
}

function buildSummary(record: MangaUpdatesSeriesRecord): MangaSummary {
  const altTitles = (record.associated ?? [])
    .map((a) => a.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 3);

  const tags = buildTags(record);

  const ratingVotes =
    typeof record.rating_votes === "number" && Number.isFinite(record.rating_votes)
      ? record.rating_votes
      : undefined;
  const bayesianRating =
    typeof record.bayesian_rating === "number" &&
    Number.isFinite(record.bayesian_rating)
      ? record.bayesian_rating
      : undefined;

  return {
    id: String(record.series_id),
    provider: "mangaupdates",
    title: record.title,
    altTitles,
    description: record.description ?? undefined,
    status: combineStatus(record.status, record.completed),
    year: parseYear(record.year),
    contentRating: undefined,
    demographic: undefined,
    latestChapter:
      record.latest_chapter !== undefined && record.latest_chapter !== null
        ? String(record.latest_chapter)
        : undefined,
    languages: [],
    originalLanguage: originalLanguageFromType(record.type),
    tags,
    coverImage: record.image?.url?.original ?? undefined,
    url: record.url,
    ratingVotes,
    bayesianRating,
  };
}

function buildDetails(record: MangaUpdatesSeriesRecord): MangaDetails {
  const summary = buildSummary(record);
  const tags = buildTags(record);

  const contributors: MangaContributor[] = (record.authors ?? [])
    .filter((a) => a.name)
    .map((a, index) => {
      const hasId = a.author_id !== undefined && a.author_id !== null;
      const role: MangaContributor["role"] = a.type === "Artist" ? "artist" : "author";
      return {
        id: hasId ? String(a.author_id) : `mu-${role}-${index}-${a.name}`,
        name: a.name,
        role,
      };
    });

  const hasBayesian =
    typeof record.bayesian_rating === "number" && Number.isFinite(record.bayesian_rating);
  const hasVotes =
    typeof record.rating_votes === "number" && Number.isFinite(record.rating_votes);
  const statistics =
    hasBayesian || hasVotes
      ? {
          rating: {
            ...(hasBayesian ? { bayesian: record.bayesian_rating } : {}),
            ...(hasVotes ? { votes: record.rating_votes } : {}),
          },
        }
      : undefined;

  return {
    ...summary,
    descriptionFull: record.description ?? undefined,
    lastChapter:
      record.latest_chapter !== undefined && record.latest_chapter !== null
        ? String(record.latest_chapter)
        : undefined,
    lastVolume: undefined,
    contributors,
    scanlationGroups: undefined,
    statistics,
    tagsDetailed: tags,
    availableLanguages: [],
  };
}

export interface SearchSeriesOptions {
  limit?: number;
  page?: number;
  orderby?: MangaUpdatesSearchRequest["orderby"];
  type?: MangaUpdatesSearchRequest["type"];
  genre?: string[];
  excludeGenre?: string[];
  year?: string;
}

async function fetchSeriesSearch(
  body: MangaUpdatesSearchRequest,
): Promise<MangaSummary[]> {
  const response = await mangaupdatesFetch<MangaUpdatesSearchResponse>(
    "/series/search",
    { body },
  );

  return (response.results ?? [])
    .map((hit) => hit.record)
    .filter(
      (record): record is MangaUpdatesSeriesRecord =>
        Boolean(record && record.series_id && record.title && record.url),
    )
    .map(buildSummary);
}

export async function searchSeries(
  query: string,
  options: SearchSeriesOptions = {},
): Promise<MangaSummary[]> {
  return fetchSeriesSearch({
    ...(query ? { search: query } : {}),
    perpage: options.limit ?? DEFAULT_LIMIT,
    page: options.page,
    orderby: options.orderby,
    type: options.type,
    genre: options.genre,
    exclude_genre: options.excludeGenre,
    year: options.year,
  });
}

const COMIC_TYPES: MangaUpdatesSeriesType[] = ["Manga", "Manhwa", "Manhua", "OEL"];

const TRENDING_TYPE_BY_LANGUAGE: Record<"ja" | "ko" | "zh", MangaUpdatesSeriesType> = {
  ja: "Manga",
  ko: "Manhwa",
  zh: "Manhua",
};

const ADULT_EXCLUDE_GENRES = [
  "Adult",
  "Hentai",
  "Mature",
  "Smut",
  "Ecchi",
  "Yaoi",
  "Yuri",
];

const ADULT_TAG_PATTERN = /\b(adult|hentai|mature|smut|ecchi|yaoi|yuri|lolicon|shotacon)\b/i;

function isAdultSummary(summary: MangaSummary): boolean {
  return summary.tags.some((tag) => ADULT_TAG_PATTERN.test(tag));
}

export async function getTrendingByLanguage(
  language: "ja" | "ko" | "zh",
  limit = DEFAULT_LIMIT,
): Promise<MangaSummary[]> {
  const results = await fetchSeriesSearch({
    type: [TRENDING_TYPE_BY_LANGUAGE[language]],
    orderby: "week_pos",
    exclude_genre: ADULT_EXCLUDE_GENRES,
    perpage: limit,
  });
  return results.filter((summary) => !isAdultSummary(summary));
}

/**
 * Combined trending across all comic types, ordered by MU's `week_pos`
 * — their internal weekly-readership ranking computed from page views and
 * active reading-list activity on mangaupdates.com. This is "what people
 * are actually reading this week" from an external data source, not from
 * shujia's own tracking signal.
 */
export async function getTrending(
  limit = DEFAULT_LIMIT,
): Promise<MangaSummary[]> {
  const results = await fetchSeriesSearch({
    type: COMIC_TYPES,
    orderby: "week_pos",
    exclude_genre: ADULT_EXCLUDE_GENRES,
    perpage: limit,
  });
  return results.filter((summary) => !isAdultSummary(summary));
}

export async function getPopularNewTitles(
  limit = DEFAULT_LIMIT,
): Promise<MangaSummary[]> {
  const results = await fetchSeriesSearch({
    year: String(new Date().getFullYear()),
    type: COMIC_TYPES,
    orderby: "week_pos",
    exclude_genre: ADULT_EXCLUDE_GENRES,
    perpage: limit,
  });
  return results.filter((summary) => !isAdultSummary(summary));
}

async function hydrateSummaries(
  candidates: { id: number; chapter?: string }[],
  limit: number,
): Promise<MangaSummary[]> {
  const overFetch = Math.min(candidates.length, Math.max(limit * 2, limit + 10));
  const slice = candidates.slice(0, overFetch);

  const summaries = await Promise.all(
    slice.map(async ({ id, chapter }) => {
      try {
        const summary = await getSeriesSummaryById(id);
        if (!summary || isAdultSummary(summary)) return null;
        if (chapter && chapter.trim()) summary.latestChapter = chapter;
        return summary;
      } catch {
        return null;
      }
    }),
  );

  return summaries.filter((s): s is MangaSummary => s !== null).slice(0, limit);
}

export async function getRecentReleases(
  limit = DEFAULT_LIMIT,
): Promise<MangaSummary[]> {
  const response = await mangaupdatesFetch<MangaUpdatesReleaseResponse>(
    "/releases/days?include_metadata=true",
    { method: "GET" },
  );

  const seen = new Set<number>();
  const candidates: { id: number; chapter?: string }[] = [];
  for (const result of response.results ?? []) {
    const id = result.metadata?.series?.series_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    candidates.push({ id, chapter: result.record?.chapter });
  }

  return hydrateSummaries(candidates, limit);
}

export async function getSeriesSummaryById(
  seriesId: string | number,
): Promise<MangaSummary | null> {
  try {
    const record = await mangaupdatesFetch<MangaUpdatesSeriesRecord>(
      `/series/${encodeURIComponent(String(seriesId))}`,
    );
    if (!record?.series_id || !record.title || !record.url) return null;
    return buildSummary(record);
  } catch (error) {
    if (error instanceof MangaUpdatesAPIError && error.status === 404) return null;
    throw error;
  }
}

export async function getSeriesDetailsById(
  seriesId: string | number,
): Promise<MangaDetails | null> {
  try {
    const record = await mangaupdatesFetch<MangaUpdatesSeriesRecord>(
      `/series/${encodeURIComponent(String(seriesId))}`,
    );
    if (!record?.series_id || !record.title || !record.url) return null;
    return buildDetails(record);
  } catch (error) {
    if (error instanceof MangaUpdatesAPIError && error.status === 404) return null;
    throw error;
  }
}

export { MangaUpdatesAPIError };
