// MangaUpdates API Response Types based on the official API specification

export interface ImageModel {
  url?: {
    original?: string;
    thumb?: string;
  };
  height?: number;
  width?: number;
}

export interface TimeModel {
  timestamp?: number;
  as_rfc3339?: string;
  as_string?: string;
}

export interface GenreModel {
  genre: string;
}

export interface AuthorModel {
  name: string;
  author_id?: number;
  url?: string;
  type: "Author" | "Artist";
}

export interface PublisherModel {
  publisher_name: string;
  publisher_id?: number;
  url?: string;
  type: "Original" | "English";
  notes?: string;
}

export interface RelatedSeriesModel {
  relation_id?: number;
  relation_type:
    | "Prequel"
    | "Sequel"
    | "Spin-Off"
    | "Adapted From"
    | "Alternate Version"
    | "Part of Anthology"
    | "Main Story"
    | "Side Story"
    | "Full Anthology"
    | "Other";
  related_series_id: number;
  related_series_name?: string;
  related_series_url?: string;
  triggered_by_relation_id?: number;
}

export interface CategoryModel {
  series_id?: number;
  category: string;
  votes?: number;
  votes_plus?: number;
  votes_minus?: number;
  added_by?: number;
}

// Search result model (lighter weight than full model)
export interface SeriesModelSearchV1 {
  series_id: number;
  title: string;
  url: string;
  description?: string;
  image?: ImageModel;
  type?:
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
  year?: string;
  bayesian_rating?: number;
  rating_votes?: number;
  genres?: GenreModel[];
  latest_chapter?: number;
  rank?: {
    position?: {
      week?: number;
      month?: number;
      three_months?: number;
      six_months?: number;
      year?: number;
    };
    old_position?: {
      week?: number;
      month?: number;
      three_months?: number;
      six_months?: number;
      year?: number;
    };
    lists?: {
      reading?: number;
      wish?: number;
      complete?: number;
      unfinished?: number;
      custom?: number;
    };
  };
  last_updated?: TimeModel;
  admin?: {
    added_by?: {
      user_id?: number;
      username?: string;
    };
    approved?: boolean;
  };
}

// Full series model with all details
export interface SeriesModelV1 extends SeriesModelSearchV1 {
  associated?: Array<{
    title: string;
  }>;
  categories?: CategoryModel[];
  forum_id?: number;
  status?: string;
  licensed?: boolean;
  completed?: boolean;
  anime?: {
    start?: string;
    end?: string;
  };
  related_series?: RelatedSeriesModel[];
  authors?: AuthorModel[];
  publishers?: PublisherModel[];
  publications?: Array<{
    publication_name: string;
    publisher_name?: string;
    publisher_id?: string;
  }>;
  recommendations?: Array<{
    series_id: number;
    series_name: string;
    weight: number;
  }>;
  category_recommendations?: Array<{
    series_id: number;
    series_name: string;
    weight: number;
  }>;
}

export interface SeriesSearchRequestV1 {
  search?: string;
  added_by?: number;
  stype?: "title" | "description";
  licensed?: "yes" | "no";
  type?: string[];
  year?: string;
  filter_types?: string[];
  category?: string[];
  pubname?: string;
  filter?:
    | "scanlated"
    | "completed"
    | "oneshots"
    | "no_oneshots"
    | "some_releases"
    | "no_releases";
  filters?: Array<
    | "scanlated"
    | "completed"
    | "oneshots"
    | "no_oneshots"
    | "some_releases"
    | "no_releases"
  >;
  list?: string;
  page?: number;
  perpage?: number;
  letter?: string;
  genre?: string[];
  exclude_genre?: string[];
  orderby?: "score" | "title" | "rank" | "rating" | "year";
}

export interface SeriesSearchResponseV1 {
  total_hits: number;
  page: number;
  per_page: number;
  results: Array<{
    record: SeriesModelSearchV1;
    hit_title?: string;
    metadata?: {
      user_list?: unknown;
      user_genre_highlights?: Array<{
        genre: string;
        color: string;
      }>;
    };
  }>;
}

export interface ApiResponseV1 {
  status?: string;
  reason?: string;
}

export interface MangaUpdatesErrorResponse {
  status?: string;
  reason?: string;
}

// Normalized types for internal use (matches existing MangaSummary/MangaDetails structure)
export interface MangaSummary {
  id: string; // Note: MangaUpdates uses numbers, we'll convert to string for consistency
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

