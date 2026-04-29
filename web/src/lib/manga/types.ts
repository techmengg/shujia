export type Provider = "mangadex" | "mangaupdates";

export interface MangaSummary {
  id: string;
  provider: Provider;
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
  // Total MU rating votes — useful for filtering out obscure series with
  // no community signal. Populated by the MU search adapter when present.
  ratingVotes?: number;
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
    votes?: number;
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
