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
  tags: string[];
  coverImage?: string;
  url: string;
}
