export interface MangaDexTagAttributes {
  name: Record<string, string>;
}

export interface MangaDexTag {
  id: string;
  type: "tag";
  attributes: MangaDexTagAttributes;
}

export interface MangaDexCoverArtAttributes {
  fileName: string;
  description?: string | null;
  locale?: string | null;
}

export interface MangaDexRelationship<TType extends string = string> {
  id: string;
  type: TType;
  related?: string;
  attributes?: MangaDexCoverArtAttributes | Record<string, unknown>;
}

export interface MangaDexMangaAttributes {
  title: Record<string, string>;
  altTitles: Array<Record<string, string>>;
  description: Record<string, string>;
  tags: MangaDexTag[];
  status?: string | null;
  year?: number | null;
  contentRating?: string | null;
  publicationDemographic?: string | null;
  latestUploadedChapter?: string | null;
  lastChapter?: string | null;
  lastVolume?: string | null;
  chapterNumbersResetOnNewVolume?: boolean;
  originalLanguage?: string | null;
  availableTranslatedLanguages?: string[];
}

export interface MangaDexManga {
  id: string;
  type: "manga";
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

export interface MangaDexCollectionResponse<TItem> {
  result: "ok";
  response: "collection";
  data: TItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface MangaDexError {
  id: string;
  status: number;
  title: string;
  detail: string;
}

export interface MangaDexErrorResponse {
  result: "error";
  errors: MangaDexError[];
}

export type MangaDexResponse<TItem> =
  | MangaDexCollectionResponse<TItem>
  | MangaDexErrorResponse;

export interface MangaSummary {
  id: string;
  title: string;
  altTitles: string[];
  description?: string;
  status?: string;
  year?: number;
  contentRating?: string;
  demographic?: string;
  latestChapter?: string;
  languages: string[];
  originalLanguage?: string;
  tags: string[];
  coverImage?: string;
  url: string;
}

export interface MangaContributor {
  id: string;
  name: string;
  role: "author" | "artist";
}

export interface MangaScanlationGroup {
  
  id: string;
  
  name: string;
}
export interface MangaStatistics {
  follows?: number;
  rating?: {
    average?: number;
    bayesian?: number;
  };
}

export interface MangaDetails extends MangaSummary {
  descriptionFull?: string;
  lastChapter?: string;
  lastVolume?: string;
  contributors: MangaContributor[];
  scanlationGroups?: MangaScanlationGroup[];
  statistics?: MangaStatistics;
  tagsDetailed: string[];
  availableLanguages: string[];
}

export interface MangaDexStatisticsEntry {
  rating?: {
    average?: number;
    bayesian?: number;
    distribution?: Record<string, number>;
  };
  follows?: number;
  comments?: number;
}

export interface MangaDexStatisticsResponse {
  result: "ok";
  statistics: Record<string, MangaDexStatisticsEntry>;
}
