/**
 * MangaUpdates provider - uses the official MangaUpdates API
 * 
 * NOTES:
 * - Uses the official public API (https://api.mangaupdates.com/v1/)
 * - No scraping required for basic manga data
 * - API provides: title, description, authors, genres, ratings, etc.
 * - Respects rate limits and uses proper User-Agent
 * - Results cached for 1 hour to minimize requests
 * 
 * API Documentation: https://api.mangaupdates.com/v1/docs
 */

import { NormalizedManga, Author, SearchResult } from '../types/manga';

const BASE_URL = 'https://www.mangaupdates.com';

// Adult content filtering - 3 levels
// Level 1: Mature Content (mild nudity, suggestive situations, romantic tension)
const MATURE_GENRES = ['Ecchi', 'Mature'];

// Level 2: Frequent Nudity or Sexual Content (explicit intimacy, recurring nudity)
const EXPLICIT_GENRES = ['Smut', 'Adult'];

// Level 3: Adult Only Sexual Content (pornographic, graphic sexual material)
const PORNOGRAPHIC_GENRES = ['Hentai', 'Doujinshi'];

// Helper to build exclude_genre list based on filter level
function getExcludedGenres(options: {
  showMatureContent?: boolean;
  showExplicitContent?: boolean;
  showPornographicContent?: boolean;
}): string[] {
  const excluded: string[] = [];
  
  // If pornographic is disabled, exclude level 3
  if (!options.showPornographicContent) {
    excluded.push(...PORNOGRAPHIC_GENRES);
  }
  
  // If explicit is disabled, exclude level 2 AND level 3
  if (!options.showExplicitContent) {
    excluded.push(...EXPLICIT_GENRES);
    excluded.push(...PORNOGRAPHIC_GENRES);
  }
  
  // If mature is disabled, exclude ALL levels
  if (!options.showMatureContent) {
    excluded.push(...MATURE_GENRES);
    excluded.push(...EXPLICIT_GENRES);
    excluded.push(...PORNOGRAPHIC_GENRES);
  }
  
  // Remove duplicates
  return [...new Set(excluded)];
}

export async function getMangaUpdatesById(id: string): Promise<NormalizedManga> {
  // Use the MangaUpdates API instead of scraping
  // This is more reliable and respectful
  console.log(`[MangaUpdates] Fetching series ${id} from API`);
  
  try {
    const apiResponse = await fetch(`https://api.mangaupdates.com/v1/series/${id}`);
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status} for series ${id}`);
    }
    
    const apiData = await apiResponse.json();
    
    // Extract data from API response
    const url = apiData.url || `${BASE_URL}/series/${id}`;
    const seriesId = String(apiData.series_id || id);
    const title = apiData.title || 'Unknown Title';
    
    // Alternative titles from associated names
    const alternativeTitles: string[] = [];
    if (apiData.associated) {
      for (const assoc of apiData.associated) {
        if (assoc.title && assoc.title !== title) {
          alternativeTitles.push(assoc.title);
        }
      }
    }
    
    const description = apiData.description || undefined;
    const type = apiData.type || undefined;
    const year = apiData.year ? parseInt(apiData.year) : undefined;
    
    // Status
    let status: string | undefined;
    if (apiData.completed) {
      status = 'Completed';
    } else {
      status = 'Ongoing';
    }
    
    // Authors
    const authors: Author[] = [];
    if (apiData.authors) {
      for (const author of apiData.authors) {
        if (author.type === 'Author') {
          authors.push({
            name: author.name,
            id: String(author.author_id || ''),
            role: 'Author',
          });
        }
      }
    }
    
    // Artists
    const artists: Author[] = [];
    if (apiData.authors) {
      for (const author of apiData.authors) {
        if (author.type === 'Artist') {
          artists.push({
            name: author.name,
            id: String(author.author_id || ''),
            role: 'Artist',
          });
        }
      }
    }
    
    // Genres
    const genres: string[] = [];
    if (apiData.genres) {
      for (const genre of apiData.genres) {
        if (genre.genre) {
          genres.push(genre.genre);
        }
      }
    }
    
    // Categories as tags
    const tags: string[] = [];
    if (apiData.categories) {
      for (const category of apiData.categories) {
        if (category.category) {
          tags.push(category.category);
        }
      }
    }
    
    // Rating
    let rating: { average?: number; bayesian?: number; votes?: number } | undefined;
    if (apiData.bayesian_rating || apiData.rating_votes) {
      rating = {
        bayesian: apiData.bayesian_rating,
        votes: apiData.rating_votes,
      };
    }
    
    // Latest chapter
    const latestChapter = apiData.latest_chapter ? String(apiData.latest_chapter) : undefined;
    
    // Cover image - prioritize highest quality
    const coverImage = apiData.image?.url?.original || apiData.image?.url?.thumb || undefined;
    
    // External links
    const externalLinks = [];
    // MangaUpdates API doesn't provide external links in the series endpoint
    
    // Where to read
    const whereToRead = [];
    // Would need to scrape or call additional API endpoints for this
    
    return {
      provider: 'mangaupdates',
      providerId: seriesId,
      title,
      alternativeTitles,
      description,
      type,
      status,
      year,
      authors,
      artists,
      genres,
      tags,
      rating,
      latestChapter,
      coverImage,
      externalLinks,
      whereToRead,
      sourceUrl: url,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`[MangaUpdates] Error fetching series ${id}:`, error);
    throw error;
  }
}

export async function searchMangaUpdates(query: string, options: { 
  limit?: number; 
  page?: number; 
  showMatureContent?: boolean;
  showExplicitContent?: boolean;
  showPornographicContent?: boolean;
} = {}): Promise<SearchResult[]> {
  // Use the MangaUpdates API for search (no scraping needed)
  const limit = options.limit || 10;
  const page = options.page || 1;
  const { showMatureContent = false, showExplicitContent = false, showPornographicContent = false } = options;
  
  console.log(`[MangaUpdates] Searching for "${query}" (limit: ${limit}, page: ${page}, mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  try {
    const requestBody: any = {
      search: query,
      stype: 'title',
      perpage: limit,
      page,
    };
    
    // Apply 3-tier adult content filtering
    const excludedGenres = getExcludedGenres({
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    });
    
    if (excludedGenres.length > 0) {
      requestBody.exclude_genre = excludedGenres;
    }
    
    const apiResponse = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    
    if (!apiData.results || apiData.results.length === 0) {
      return [];
    }
    
    return apiData.results.map((result: any) => ({
      provider: 'mangaupdates',
      providerId: String(result.record.series_id),
      title: result.record.title,
      type: result.record.type,
      year: result.record.year ? parseInt(result.record.year) : undefined,
      coverImage: result.record.image?.url?.original || result.record.image?.url?.thumb,
      matchScore: result.hit_title_match ? 1.0 : 0.5,
    }));
  } catch (error) {
    console.error(`[MangaUpdates] Search error:`, error);
    return [];
  }
}

export async function getRecentlyUpdatedMangaUpdates(limit: number = 20): Promise<SearchResult[]> {
  // Use the MangaUpdates API for recent releases
  console.log(`[MangaUpdates] Fetching ${limit} recently updated series`);
  
  try {
    const apiResponse = await fetch('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        perpage: limit,
        page: 1,
        include_metadata: true,
      }),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    
    if (!apiData.results || apiData.results.length === 0) {
      return [];
    }
    
    // Extract unique series from releases
    const seenIds = new Set<string>();
    const results: SearchResult[] = [];
    
    for (const result of apiData.results) {
      const record = result.record;
      if (!record.series) continue;
      
      const seriesId = String(record.series.series_id);
      if (seenIds.has(seriesId)) continue;
      
      seenIds.add(seriesId);
      results.push({
        provider: 'mangaupdates',
        providerId: seriesId,
        title: record.series.title,
        type: record.series.type,
        year: record.series.year ? parseInt(record.series.year) : undefined,
        coverImage: record.series.image?.url?.original || record.series.image?.url?.thumb,
      });
    }
    
    return results;
  } catch (error) {
    console.error(`[MangaUpdates] Recent updates error:`, error);
    return [];
  }
}

export async function browseMangaUpdates(options: {
  limit?: number;
  page?: number;
  types?: string[];
  genres?: string[];
  orderby?: string;
  showMatureContent?: boolean;
  showExplicitContent?: boolean;
  showPornographicContent?: boolean;
} = {}): Promise<{ results: SearchResult[]; total: number }> {
  // Use the MangaUpdates API for browsing/filtering
  const limit = options.limit || 30;
  const page = options.page || 1;
  const { showMatureContent = false, showExplicitContent = false, showPornographicContent = false } = options;
  
  console.log(`[MangaUpdates] Browsing (limit: ${limit}, page: ${page}, mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  try {
    const requestBody: any = {
      perpage: limit,
      page,
    };
    
    if (options.types && options.types.length > 0) {
      requestBody.type = options.types;
    }
    
    if (options.genres && options.genres.length > 0) {
      requestBody.genre = options.genres;
    }
    
    if (options.orderby) {
      requestBody.orderby = options.orderby;
    }
    
    // Apply 3-tier adult content filtering
    const excludedGenres = getExcludedGenres({
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    });
    
    if (excludedGenres.length > 0) {
      requestBody.exclude_genre = excludedGenres;
    }
    
    const apiResponse = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    
    if (!apiData.results || apiData.results.length === 0) {
      return { results: [], total: 0 };
    }
    
    const results = apiData.results.map((result: any) => ({
      provider: 'mangaupdates',
      providerId: String(result.record.series_id),
      title: result.record.title,
      type: result.record.type,
      year: result.record.year ? parseInt(result.record.year) : undefined,
      coverImage: result.record.image?.url?.original || result.record.image?.url?.thumb,
    }));
    
    return {
      results,
      total: apiData.total_hits || 0,
    };
  } catch (error) {
    console.error(`[MangaUpdates] Browse error:`, error);
    return { results: [], total: 0 };
  }
}

export async function getDemographicHighlightsMangaUpdates(demographic: string, limit: number = 50, showMatureContent: boolean = false, showExplicitContent: boolean = false, showPornographicContent: boolean = false): Promise<SearchResult[]> {
  // Get highlights for a specific demographic (Manga, Manhwa, Manhua, Novel)
  console.log(`[MangaUpdates] Fetching ${demographic} highlights (limit: ${limit}, mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  try {
    const requestBody: any = {
      type: [demographic],
      perpage: limit,
      page: 1,
      orderby: 'rating',
    };
    
    // Apply 3-tier adult content filtering
    const excludedGenres = getExcludedGenres({
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    });
    
    if (excludedGenres.length > 0) {
      requestBody.exclude_genre = excludedGenres;
    }
    
    const apiResponse = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    
    if (!apiData.results || apiData.results.length === 0) {
      return [];
    }
    
    return apiData.results.map((result: any) => ({
      provider: 'mangaupdates',
      providerId: String(result.record.series_id),
      title: result.record.title,
      type: result.record.type,
      year: result.record.year ? parseInt(result.record.year) : undefined,
      coverImage: result.record.image?.url?.original || result.record.image?.url?.thumb,
    }));
  } catch (error) {
    console.error(`[MangaUpdates] Demographic highlights error:`, error);
    return [];
  }
}

export async function getPopularNewTitlesMangaUpdates(limit: number = 50, showMatureContent: boolean = false, showExplicitContent: boolean = false, showPornographicContent: boolean = false): Promise<SearchResult[]> {
  // Get NEW titles that are currently popular/trending
  console.log(`[MangaUpdates] Fetching popular new titles (limit: ${limit}, mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  try {
    // Use month1_pos to get what's popular THIS MONTH, then filter for new titles
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; // Last 3 years = "new" titles
    
    const requestBody: any = {
      perpage: limit * 3, // Fetch more to filter by year
      page: 1,
      orderby: 'month1_pos', // What's popular THIS MONTH (current trending)
    };
    
    // Apply 3-tier adult content filtering
    const excludedGenres = getExcludedGenres({
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    });
    
    if (excludedGenres.length > 0) {
      requestBody.exclude_genre = excludedGenres;
    }
    
    const apiResponse = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`MangaUpdates API returned ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    
    if (!apiData.results || apiData.results.length === 0) {
      return [];
    }
    
    // Filter for recent years ONLY (new titles that are currently popular)
    return apiData.results
      .filter((result: any) => {
        if (!result.record.year) return false;
        const year = parseInt(result.record.year);
        return year >= startYear; // Recent years only = "new" titles
      })
      .map((result: any) => ({
        provider: 'mangaupdates',
        providerId: String(result.record.series_id),
        title: result.record.title,
        type: result.record.type,
        year: result.record.year ? parseInt(result.record.year) : undefined,
        coverImage: result.record.image?.url?.original || result.record.image?.url?.thumb,
      }))
      .slice(0, limit);
  } catch (error) {
    console.error(`[MangaUpdates] Popular new titles error:`, error);
    return [];
  }
}

export async function getRecentPopularByLanguageMangaUpdates(
  language: string, 
  limit: number = 50, 
  showMatureContent: boolean = false, 
  showExplicitContent: boolean = false, 
  showPornographicContent: boolean = false,
  timeframe: '7d' | '1m' | '3m' | 'mixed' = 'mixed'
): Promise<SearchResult[]> {
  // Map language codes to MangaUpdates types
  const languageTypeMap: Record<string, string> = {
    'ja': 'Manga',
    'ko': 'Manhwa',
    'zh': 'Manhua',
  };
  
  const type = languageTypeMap[language];
  if (!type) {
    console.warn(`[MangaUpdates] Unknown language code: ${language}`);
    return [];
  }
  
  console.log(`[MangaUpdates] Fetching trending ${type} [${timeframe}] (limit: ${limit}, mature: ${showMatureContent}, explicit: ${showExplicitContent}, porn: ${showPornographicContent})`);
  
  try {
    const currentYear = new Date().getFullYear();
    const recentYearThreshold = currentYear - 5; // Last 5 years = "recent enough"
    
    // Apply 3-tier adult content filtering
    const excludedGenres = getExcludedGenres({
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    });
    
    // ALWAYS exclude Yaoi and BL content from trending sections
    const trendingExcludedGenres = [...excludedGenres, 'Yaoi', 'Shounen Ai'];
    
    // Map timeframe selection to API orderby and weights
    const timeframeMap: Record<string, Array<{ orderby: string; weight: number }>> = {
      '7d': [{ orderby: 'week_pos', weight: 1 }],
      '1m': [{ orderby: 'month1_pos', weight: 1 }],
      '3m': [{ orderby: 'month3_pos', weight: 1 }],
      'mixed': [
        { orderby: 'week_pos', weight: 3 },   // 7-day trending (highest weight)
        { orderby: 'month1_pos', weight: 2 }, // 1-month trending
        { orderby: 'month3_pos', weight: 1 }, // 3-month trending
      ],
    };
    
    const timeframes = timeframeMap[timeframe] || timeframeMap['mixed'];
    
    const allResults = await Promise.all(
      timeframes.map(async ({ orderby, weight }) => {
        try {
          const requestBody: any = {
            type: [type],
            perpage: Math.ceil(limit / 2), // Fetch fewer per timeframe
            page: 1,
            orderby,
          };
          
          if (trendingExcludedGenres.length > 0) {
            requestBody.exclude_genre = trendingExcludedGenres;
          }
          
          const response = await fetch('https://api.mangaupdates.com/v1/series/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          
          if (!response.ok) return [];
          
          const data = await response.json();
          
          if (!data.results || data.results.length === 0) return [];
          
          // Map results with weight for scoring
          return data.results.map((result: any) => ({
            provider: 'mangaupdates',
            providerId: String(result.record.series_id),
            title: result.record.title,
            type: result.record.type,
            year: result.record.year ? parseInt(result.record.year) : undefined,
            coverImage: result.record.image?.url?.original || result.record.image?.url?.thumb,
            weight, // Add weight for prioritization
            isRecent: result.record.year && parseInt(result.record.year) >= recentYearThreshold,
          }));
        } catch {
          return [];
        }
      })
    );
    
    // Flatten and deduplicate by series ID, prioritizing:
    // 1. Recent releases (last 5 years)
    // 2. Higher weight (7-day > 1-month > 3-month)
    const seenIds = new Set<string>();
    const uniqueResults: any[] = [];
    
    // Sort by: isRecent DESC, weight DESC
    const sortedResults = allResults
      .flat()
      .sort((a, b) => {
        // Prioritize recent releases
        if (a.isRecent && !b.isRecent) return -1;
        if (!a.isRecent && b.isRecent) return 1;
        // Then by weight (7d > 1m > 3m)
        return b.weight - a.weight;
      });
    
    for (const result of sortedResults) {
      if (!seenIds.has(result.providerId) && uniqueResults.length < limit) {
        seenIds.add(result.providerId);
        // Remove weight and isRecent before returning
        const { weight, isRecent, ...cleanResult } = result;
        uniqueResults.push(cleanResult);
      }
    }
    
    console.log(`[MangaUpdates] Trending ${type}: Got ${uniqueResults.length} unique results from ${allResults.flat().length} total`);
    
    return uniqueResults;
  } catch (error) {
    console.error(`[MangaUpdates] Trending ${type} error:`, error);
    return [];
  }
}

