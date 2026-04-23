import { MangaUpdatesAPIError, mangaupdatesFetch } from "./client";
import type {
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
  };
}

function buildDetails(record: MangaUpdatesSeriesRecord): MangaDetails {
  const summary = buildSummary(record);
  const tags = buildTags(record);

  const contributors: MangaContributor[] = (record.authors ?? [])
    .filter((a) => a.name)
    .map((a) => ({
      id: a.author_id !== undefined ? String(a.author_id) : a.name,
      name: a.name,
      role: a.type === "Artist" ? "artist" : "author",
    }));

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
    statistics: undefined,
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

export async function searchSeries(
  query: string,
  options: SearchSeriesOptions = {},
): Promise<MangaSummary[]> {
  const body: MangaUpdatesSearchRequest = {
    search: query,
    perpage: options.limit ?? DEFAULT_LIMIT,
    page: options.page,
    orderby: options.orderby,
    type: options.type,
    genre: options.genre,
    exclude_genre: options.excludeGenre,
    year: options.year,
  };

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
