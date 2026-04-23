export interface MangaUpdatesImage {
  url?: {
    original?: string;
    thumb?: string;
  };
  height?: number;
  width?: number;
}

export interface MangaUpdatesAssociatedTitle {
  title: string;
}

export interface MangaUpdatesGenre {
  genre: string;
}

export interface MangaUpdatesCategory {
  series_id?: number;
  category: string;
  votes?: number;
  votes_plus?: number;
  votes_minus?: number;
  added_by?: number;
}

export interface MangaUpdatesAuthor {
  name: string;
  author_id?: number;
  url?: string;
  type: "Author" | "Artist";
}

export type MangaUpdatesSeriesType =
  | "Artbook"
  | "Doujinshi"
  | "Drama CD"
  | "Filipino"
  | "Indonesian"
  | "Manga"
  | "Manhwa"
  | "Manhua"
  | "Novel"
  | "OEL"
  | "Thai"
  | "Vietnamese"
  | "Malaysian"
  | "Nordic"
  | "French"
  | "Spanish"
  | "German";

export interface MangaUpdatesSeriesRecord {
  series_id: number;
  title: string;
  url: string;
  associated?: MangaUpdatesAssociatedTitle[];
  description?: string;
  image?: MangaUpdatesImage;
  type?: MangaUpdatesSeriesType;
  year?: string;
  genres?: MangaUpdatesGenre[];
  categories?: MangaUpdatesCategory[];
  latest_chapter?: number;
  status?: string;
  licensed?: boolean;
  completed?: boolean;
  authors?: MangaUpdatesAuthor[];
}

export interface MangaUpdatesSearchResult {
  record: Partial<MangaUpdatesSeriesRecord> & { series_id: number; title: string };
  hit_title?: string;
}

export interface MangaUpdatesSearchResponse {
  total_hits?: number;
  page?: number;
  per_page?: number;
  results?: MangaUpdatesSearchResult[];
}

export type MangaUpdatesSearchOrderBy =
  | "score"
  | "title"
  | "rank"
  | "rating"
  | "year"
  | "date_added"
  | "week_pos"
  | "month1_pos"
  | "month3_pos"
  | "month6_pos"
  | "year_pos";

export interface MangaUpdatesSearchRequest {
  search?: string;
  stype?: "title" | "description";
  type?: MangaUpdatesSeriesType[];
  year?: string;
  category?: string[];
  genre?: string[];
  exclude_genre?: string[];
  page?: number;
  perpage?: number;
  orderby?: MangaUpdatesSearchOrderBy;
}
