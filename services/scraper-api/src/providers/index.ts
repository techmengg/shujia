/**
 * Provider manager - coordinates multiple manga data providers
 */

import { NormalizedManga, SearchResult, ProviderConfig } from '../types/manga';
import { 
  getMangaUpdatesById, 
  searchMangaUpdates, 
  getRecentlyUpdatedMangaUpdates,
  browseMangaUpdates,
  getDemographicHighlightsMangaUpdates,
  getPopularNewTitlesMangaUpdates,
  getRecentPopularByLanguageMangaUpdates
} from './mangaupdates';
import { mangaCache, searchCache } from '../cache/memory';

// Provider registry
const PROVIDERS: Record<string, ProviderConfig> = {
  mangaupdates: {
    name: 'MangaUpdates',
    baseUrl: 'https://www.mangaupdates.com',
    enabled: true,
    rateLimit: {
      requestsPerSecond: 0.5,
      delayMs: 2000,
    },
  },
  // Add more providers here as they're implemented
  // mangadex: { ... },
  // anilist: { ... },
};

type ProviderName = keyof typeof PROVIDERS;

/**
 * Get manga from a specific provider by ID
 */
export async function getMangaFromProvider(
  provider: string,
  id: string,
  useCache: boolean = true
): Promise<NormalizedManga> {
  const cacheKey = `manga:${provider}:${id}`;
  
  // Check cache first
  if (useCache) {
    const cached = mangaCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Cache hit for ${cacheKey}`);
      return cached;
    }
  }
  
  // Validate provider
  if (!PROVIDERS[provider]?.enabled) {
    throw new Error(`Provider '${provider}' is not available`);
  }
  
  console.log(`[Provider] Fetching from ${provider}: ${id}`);
  
  let manga: NormalizedManga;
  
  switch (provider) {
    case 'mangaupdates':
      manga = await getMangaUpdatesById(id);
      break;
    
    // Add more providers here
    // case 'mangadex':
    //   manga = await getMangaDexById(id);
    //   break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the result
  if (useCache) {
    mangaCache.set(cacheKey, manga);
  }
  
  return manga;
}

/**
 * Search across multiple providers
 */
export async function searchAllProviders(
  query: string,
  providers: string[] = ['mangaupdates'],
  limit: number = 10,
  showMatureContent: boolean = false,
  showExplicitContent: boolean = false,
  showPornographicContent: boolean = false,
  useCache: boolean = true
): Promise<SearchResult[]> {
  const cacheKey = `search:${query}:${providers.join(',')}:${limit}:${showMatureContent}:${showExplicitContent}:${showPornographicContent}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Search cache hit for "${query}"`);
      return cached;
    }
  }
  
  console.log(`[Provider] Searching providers for "${query}":`, providers, `mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent}`);
  
  // Search all providers in parallel
  const searchPromises = providers
    .filter((p) => PROVIDERS[p]?.enabled)
    .map(async (provider) => {
      try {
        switch (provider) {
          case 'mangaupdates':
            return await searchMangaUpdates(query, { limit, showMatureContent, showExplicitContent, showPornographicContent });
          
          // Add more providers
          // case 'mangadex':
          //   return await searchMangaDex(query, limit);
          
          default:
            console.warn(`[Provider] Search not implemented for ${provider}`);
            return [];
        }
      } catch (error) {
        console.error(`[Provider] Search failed for ${provider}:`, error);
        return [];
      }
    });
  
  const results = await Promise.all(searchPromises);
  const allResults = results.flat();
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, allResults);
  }
  
  return allResults;
}

/**
 * Get list of enabled providers
 */
export function getEnabledProviders(): ProviderConfig[] {
  return Object.entries(PROVIDERS)
    .filter(([_, config]) => config.enabled)
    .map(([_, config]) => config);
}

/**
 * Check if a provider is enabled
 */
export function isProviderEnabled(provider: string): boolean {
  return PROVIDERS[provider]?.enabled || false;
}

/**
 * Get recently updated manga from a provider
 */
export async function getRecentlyUpdated(
  provider: string = 'mangaupdates',
  limit: number = 20,
  useCache: boolean = true
): Promise<SearchResult[]> {
  const cacheKey = `recent:${provider}:${limit}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Recent cache hit for ${provider}`);
      return cached;
    }
  }
  
  console.log(`[Provider] Fetching recently updated from ${provider}`);
  
  let results: SearchResult[];
  
  switch (provider) {
    case 'mangaupdates':
      results = await getRecentlyUpdatedMangaUpdates(limit);
      break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, results);
  }
  
  return results;
}

/**
 * Browse manga with filters
 */
export async function browseManga(
  provider: string = 'mangaupdates',
  options: {
    limit?: number;
    page?: number;
    types?: string[];
    genres?: string[];
    orderby?: string;
    showMatureContent?: boolean;
    showExplicitContent?: boolean;
    showPornographicContent?: boolean;
  } = {},
  useCache: boolean = true
): Promise<{ results: SearchResult[]; total: number }> {
  const { showMatureContent = false, showExplicitContent = false, showPornographicContent = false } = options;
  const cacheKey = `browse:${provider}:${JSON.stringify({...options, showMatureContent, showExplicitContent, showPornographicContent})}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Browse cache hit`);
      return cached;
    }
  }
  
  console.log(`[Provider] Browsing ${provider} with filters (mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  let result: { results: SearchResult[]; total: number };
  
  switch (provider) {
    case 'mangaupdates':
      result = await browseMangaUpdates({...options, showMatureContent, showExplicitContent, showPornographicContent});
      break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, result);
  }
  
  return result;
}

/**
 * Get demographic highlights (top rated by type)
 */
export async function getDemographicHighlights(
  provider: string = 'mangaupdates',
  demographic: string,
  limit: number = 50,
  showMatureContent: boolean = false,
  showExplicitContent: boolean = false,
  showPornographicContent: boolean = false,
  useCache: boolean = true
): Promise<SearchResult[]> {
  const cacheKey = `highlights:${provider}:${demographic}:${limit}:${showMatureContent}:${showExplicitContent}:${showPornographicContent}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Demographic highlights cache hit`);
      return cached;
    }
  }
  
  console.log(`[Provider] Fetching ${demographic} highlights from ${provider} (mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  let results: SearchResult[];
  
  switch (provider) {
    case 'mangaupdates':
      results = await getDemographicHighlightsMangaUpdates(demographic, limit, showMatureContent, showExplicitContent, showPornographicContent);
      break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, results);
  }
  
  return results;
}

/**
 * Get popular new titles
 */
export async function getPopularNewTitles(
  provider: string = 'mangaupdates',
  limit: number = 50,
  showMatureContent: boolean = false,
  showExplicitContent: boolean = false,
  showPornographicContent: boolean = false,
  useCache: boolean = true
): Promise<SearchResult[]> {
  const cacheKey = `popular-new:${provider}:${limit}:${showMatureContent}:${showExplicitContent}:${showPornographicContent}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Popular new titles cache hit`);
      return cached;
    }
  }
  
  console.log(`[Provider] Fetching popular new titles from ${provider} (mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  let results: SearchResult[];
  
  switch (provider) {
    case 'mangaupdates':
      results = await getPopularNewTitlesMangaUpdates(limit, showMatureContent, showExplicitContent, showPornographicContent);
      break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, results);
  }
  
  return results;
}

/**
 * Get recent popular manga by language/region
 */
export async function getRecentPopularByLanguage(
  provider: string = 'mangaupdates',
  language: string,
  limit: number = 50,
  showMatureContent: boolean = false,
  showExplicitContent: boolean = false,
  showPornographicContent: boolean = false,
  timeframe: '7d' | '1m' | '3m' | 'mixed' = 'mixed',
  useCache: boolean = true
): Promise<SearchResult[]> {
  const cacheKey = `trending:${provider}:${language}:${limit}:${showMatureContent}:${showExplicitContent}:${showPornographicContent}:${timeframe}`;
  
  // Check cache
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Provider] Trending by language cache hit`);
      return cached;
    }
  }
  
  console.log(`[Provider] Fetching trending ${language} [${timeframe}] from ${provider} (mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  let results: SearchResult[];
  
  switch (provider) {
    case 'mangaupdates':
      results = await getRecentPopularByLanguageMangaUpdates(language, limit, showMatureContent, showExplicitContent, showPornographicContent, timeframe);
      break;
    
    default:
      throw new Error(`Provider '${provider}' is not implemented`);
  }
  
  // Cache the results
  if (useCache) {
    searchCache.set(cacheKey, results);
  }
  
  return results;
}

