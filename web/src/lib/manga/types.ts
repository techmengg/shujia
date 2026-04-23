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
