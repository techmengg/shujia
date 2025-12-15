/**
 * Unified manga service that uses the scraper API
 * This replaces direct calls to the MangaUpdates service
 */

import { 
  getMangaByProvider, 
  searchManga as scraperSearch,
  getRecentlyUpdated,
  browseManga 
} from "./shujiaApi";
import { scraperMangaToDetails, scraperMangaToSummary, scraperSearchResultToSummary } from "./adapters/scraper-to-mangaupdates";
import type { MangaDetails, MangaSummary } from "./mangaupdates/types";

/**
 * Get manga details by ID
 * @param mangaId The manga ID (MangaUpdates series ID)
 * @returns MangaDetails or null if not found
 */
export async function getMangaDetails(mangaId: string): Promise<MangaDetails | null> {
  try {
    const scraperManga = await getMangaByProvider("mangaupdates", mangaId);
    
    if (!scraperManga) {
      return null;
    }
    
    return scraperMangaToDetails(scraperManga);
  } catch (error) {
    console.error(`[MangaService] Error fetching details for ${mangaId}:`, error);
    return null;
  }
}

/**
 * Get manga summary by ID
 * @param mangaId The manga ID (MangaUpdates series ID)
 * @returns MangaSummary or null if not found
 */
export async function getMangaSummaryById(mangaId: string): Promise<MangaSummary | null> {
  try {
    const scraperManga = await getMangaByProvider("mangaupdates", mangaId);
    
    if (!scraperManga) {
      return null;
    }
    
    return scraperMangaToSummary(scraperManga);
  } catch (error) {
    console.error(`[MangaService] Error fetching summary for ${mangaId}:`, error);
    return null;
  }
}

/**
 * Search for manga
 * @param query Search query
 * @param options Search options (limit, excludeAdultContent, etc.)
 * @returns Array of MangaSummary
 */
export async function searchManga(
  query: string,
  options?: { 
    limit?: number; 
    showMatureContent?: boolean;
    showExplicitContent?: boolean;
    showPornographicContent?: boolean;
  }
): Promise<MangaSummary[]> {
  try {
    const scraperResults = await scraperSearch(query, {
      providers: ["mangaupdates"],
      limit: options?.limit || 10,
      showMatureContent: options?.showMatureContent || false,
      showExplicitContent: options?.showExplicitContent || false,
      showPornographicContent: options?.showPornographicContent || false,
    });
    
    return scraperResults.map(scraperSearchResultToSummary);
  } catch (error) {
    console.error(`[MangaService] Error searching for "${query}":`, error);
    return [];
  }
}

/**
 * Get recently updated manga
 */
export async function getRecentlyUpdatedManga(limit: number = 20, offset: number = 0, showMatureContent: boolean = false, showExplicitContent: boolean = false, showPornographicContent: boolean = false): Promise<MangaSummary[]> {
  try {
    const scraperResults = await getRecentlyUpdated({
      provider: 'mangaupdates',
      limit: limit + offset, // Fetch extra to account for offset
    });
    
    // Apply offset manually since the scraper API doesn't support it
    const results = scraperResults.slice(offset, offset + limit);
    
    return results.map(scraperSearchResultToSummary);
  } catch (error) {
    console.error(`[MangaService] Error fetching recently updated manga:`, error);
    return [];
  }
}

/**
 * Browse manga with filters
 */
export async function exploreManga(options: {
  limit?: number;
  offset?: number;
  types?: string[];
  genres?: string[];
  orderby?: string;
  showMatureContent?: boolean;
  showExplicitContent?: boolean;
  showPornographicContent?: boolean;
} = {}): Promise<{ data: MangaSummary[]; total: number; limit: number; offset: number; hasMore: boolean }> {
  try {
    const limit = options.limit || 30;
    const offset = options.offset || 0;
    const page = Math.floor(offset / limit) + 1;
    
    const scraperResult = await browseManga({
      provider: 'mangaupdates',
      limit,
      page,
      types: options.types,
      genres: options.genres,
      orderby: options.orderby,
      showMatureContent: options.showMatureContent || false,
      showExplicitContent: options.showExplicitContent || false,
      showPornographicContent: options.showPornographicContent || false,
    });
    
    const data = scraperResult.results.map(scraperSearchResultToSummary);
    const calculatedOffset = (page - 1) * limit;
    
    return {
      data,
      total: scraperResult.total,
      limit,
      offset: calculatedOffset,
      hasMore: calculatedOffset + data.length < scraperResult.total,
    };
  } catch (error) {
    console.error(`[MangaService] Error exploring manga:`, error);
    return {
      data: [],
      total: 0,
      limit: options.limit || 30,
      offset: options.offset || 0,
      hasMore: false,
    };
  }
}

/**
 * Get demographic highlights (top rated by type)
 */
export async function getDemographicHighlights(demographic: string, limit: number = 50, showMatureContent: boolean = false, showExplicitContent: boolean = false, showPornographicContent: boolean = false): Promise<MangaSummary[]> {
  try {
    const response = await fetch(`${process.env.SCRAPER_API_URL || 'http://localhost:3001'}/manga/highlights/${demographic}?limit=${limit}&showMatureContent=${showMatureContent}&showExplicitContent=${showExplicitContent}&showPornographicContent=${showPornographicContent}`);
    if (!response.ok) return [];
    
    const json = await response.json();
    if (!json.success || !json.data) return [];
    
    return json.data.map(scraperSearchResultToSummary);
  } catch (error) {
    console.error(`[MangaService] Error fetching ${demographic} highlights:`, error);
    return [];
  }
}

/**
 * Get popular new titles
 */
export async function getPopularNewTitles(limit: number = 50, showMatureContent: boolean = false, showExplicitContent: boolean = false, showPornographicContent: boolean = false): Promise<MangaSummary[]> {
  try {
    const response = await fetch(`${process.env.SCRAPER_API_URL || 'http://localhost:3001'}/manga/popular-new?limit=${limit}&showMatureContent=${showMatureContent}&showExplicitContent=${showExplicitContent}&showPornographicContent=${showPornographicContent}`);
    if (!response.ok) return [];
    
    const json = await response.json();
    if (!json.success || !json.data) return [];
    
    return json.data.map(scraperSearchResultToSummary);
  } catch (error) {
    console.error(`[MangaService] Error fetching popular new titles:`, error);
    return [];
  }
}

/**
 * Get trending manga by language/region
 */
export async function getRecentPopularByOriginalLanguage(
  language: string, 
  limit: number = 50, 
  showMatureContent: boolean = false, 
  showExplicitContent: boolean = false, 
  showPornographicContent: boolean = false,
  timeframe: '7d' | '1m' | '3m' | 'mixed' = 'mixed'
): Promise<MangaSummary[]> {
  try {
    const response = await fetch(`${process.env.SCRAPER_API_URL || 'http://localhost:3001'}/manga/trending/${language}?limit=${limit}&showMatureContent=${showMatureContent}&showExplicitContent=${showExplicitContent}&showPornographicContent=${showPornographicContent}&timeframe=${timeframe}`);
    if (!response.ok) return [];
    
    const json = await response.json();
    if (!json.success || !json.data) return [];
    
    return json.data.map(scraperSearchResultToSummary);
  } catch (error) {
    console.error(`[MangaService] Error fetching trending ${language}:`, error);
    return [];
  }
}

