/**
 * Normalized manga data structure
 * Used across all providers for consistency
 */

export interface NormalizedManga {
  // Core identifiers
  provider: string;
  providerId: string;
  
  // Basic info
  title: string;
  alternativeTitles: string[];
  description?: string;
  
  // Metadata
  type?: 'Manga' | 'Manhwa' | 'Manhua' | 'Novel' | 'Doujinshi' | 'OEL' | string;
  status?: 'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled' | string;
  year?: number;
  
  // Content details
  authors: Author[];
  artists: Author[];
  genres: string[];
  tags: string[];
  
  // Rating/popularity
  rating?: {
    average?: number;
    bayesian?: number;
    votes?: number;
  };
  
  // Chapter info
  latestChapter?: number | string;
  totalChapters?: number;
  
  // Links
  coverImage?: string;
  externalLinks: ExternalLink[];
  whereToRead: WhereToReadLink[];
  
  // Provider-specific URL
  sourceUrl: string;
  
  // Metadata
  lastUpdated?: Date;
  scrapedAt: Date;
}

export interface Author {
  name: string;
  id?: string;
  role?: 'Author' | 'Artist' | string;
}

export interface ExternalLink {
  site: string;
  url: string;
  label?: string;
}

export interface WhereToReadLink {
  site: string;
  url: string;
  language?: string;
  official?: boolean;
}

export interface SearchResult {
  provider: string;
  providerId: string;
  title: string;
  type?: string;
  year?: number;
  coverImage?: string;
  matchScore?: number;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  enabled: boolean;
  rateLimit: {
    requestsPerSecond: number;
    delayMs: number;
  };
}

