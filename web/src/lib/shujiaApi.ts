/**
 * Shujia Scraper API client
 * Communicates with the standalone scraper service
 */

const SCRAPER_API_BASE =
  process.env.NEXT_PUBLIC_SCRAPER_API_URL ||
  process.env.SCRAPER_API_URL ||
  'http://localhost:3001';

export interface ShujiaApiManga {
  provider: string;
  providerId: string;
  title: string;
  alternativeTitles: string[];
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors: Array<{
    name: string;
    id?: string;
    role?: string;
  }>;
  artists: Array<{
    name: string;
    id?: string;
    role?: string;
  }>;
  genres: string[];
  tags: string[];
  rating?: {
    average?: number;
    bayesian?: number;
    votes?: number;
  };
  latestChapter?: number | string;
  coverImage?: string;
  externalLinks: Array<{
    site: string;
    url: string;
    label?: string;
  }>;
  whereToRead: Array<{
    site: string;
    url: string;
    language?: string;
    official?: boolean;
  }>;
  sourceUrl: string;
  scrapedAt: string;
}

export interface ShujiaApiSearchResult {
  provider: string;
  providerId: string;
  title: string;
  type?: string;
  year?: number;
  coverImage?: string;
  matchScore?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SearchResponse extends ApiResponse<ShujiaApiSearchResult[]> {
  count?: number;
  query?: string;
  providers?: string[];
}

/**
 * Fetch manga details from a specific provider
 */
export async function getMangaByProvider(
  provider: string,
  id: string,
  options: {
    cache?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<ShujiaApiManga | null> {
  const { cache = true, signal } = options;
  
  try {
    const url = new URL(`/manga/${provider}/${id}`, SCRAPER_API_BASE);
    if (!cache) {
      url.searchParams.set('cache', 'false');
    }
    
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[ShujiaAPI] HTTP ${response.status} for ${provider}/${id}`);
      return null;
    }
    
    const json: ApiResponse<ShujiaApiManga> = await response.json();
    
    if (!json.success || !json.data) {
      console.error(`[ShujiaAPI] API error:`, json.error);
      return null;
    }
    
    return json.data;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log(`[ShujiaAPI] Request aborted for ${provider}/${id}`);
      return null;
    }
    
    console.error(`[ShujiaAPI] Error fetching ${provider}/${id}:`, error);
    return null;
  }
}

/**
 * Search for manga across multiple providers
 */
export async function searchManga(
  query: string,
  options: {
    providers?: string[];
    limit?: number;
    showMatureContent?: boolean;
    showExplicitContent?: boolean;
    showPornographicContent?: boolean;
    cache?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<ShujiaApiSearchResult[]> {
  const { 
    providers = ['mangaupdates'], 
    limit = 10, 
    showMatureContent = false, 
    showExplicitContent = false, 
    showPornographicContent = false, 
    cache = true, 
    signal 
  } = options;
  
  if (!query.trim()) {
    return [];
  }
  
  try {
    const url = new URL('/manga/search', SCRAPER_API_BASE);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('providers', providers.join(','));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('showMatureContent', String(showMatureContent));
    url.searchParams.set('showExplicitContent', String(showExplicitContent));
    url.searchParams.set('showPornographicContent', String(showPornographicContent));
    if (!cache) {
      url.searchParams.set('cache', 'false');
    }
    
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[ShujiaAPI] Search HTTP ${response.status}`);
      return [];
    }
    
    const json: SearchResponse = await response.json();
    
    if (!json.success || !json.data) {
      console.error(`[ShujiaAPI] Search API error:`, json.error);
      return [];
    }
    
    return json.data;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log(`[ShujiaAPI] Search request aborted`);
      return [];
    }
    
    console.error(`[ShujiaAPI] Search error:`, error);
    return [];
  }
}

/**
 * Get list of enabled providers
 */
export async function getEnabledProviders(): Promise<Array<{
  name: string;
  baseUrl: string;
  enabled: boolean;
}>> {
  try {
    const url = new URL('/manga/providers', SCRAPER_API_BASE);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const json: ApiResponse<any[]> = await response.json();
    
    return json.success && json.data ? json.data : [];
  } catch (error) {
    console.error(`[ShujiaAPI] Error fetching providers:`, error);
    return [];
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const url = new URL('/health', SCRAPER_API_BASE);
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get recently updated manga
 */
export async function getRecentlyUpdated(options: {
  provider?: string;
  limit?: number;
  cache?: boolean;
  signal?: AbortSignal;
} = {}): Promise<ShujiaApiSearchResult[]> {
  const { provider = 'mangaupdates', limit = 20, cache = true, signal } = options;
  
  try {
    const url = new URL('/manga/recent', SCRAPER_API_BASE);
    url.searchParams.set('provider', provider);
    url.searchParams.set('limit', String(limit));
    if (!cache) {
      url.searchParams.set('cache', 'false');
    }
    
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[ShujiaAPI] Recent HTTP ${response.status}`);
      return [];
    }
    
    const json: ApiResponse<ShujiaApiSearchResult[]> = await response.json();
    
    if (!json.success || !json.data) {
      console.error(`[ShujiaAPI] Recent API error:`, json.error);
      return [];
    }
    
    return json.data;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log(`[ShujiaAPI] Recent request aborted`);
      return [];
    }
    
    console.error(`[ShujiaAPI] Recent error:`, error);
    return [];
  }
}

/**
 * Browse manga with filters
 */
export async function browseManga(options: {
  provider?: string;
  limit?: number;
  page?: number;
  types?: string[];
  genres?: string[];
  orderby?: string;
  showMatureContent?: boolean;
  showExplicitContent?: boolean;
  showPornographicContent?: boolean;
  cache?: boolean;
  signal?: AbortSignal;
} = {}): Promise<{ results: ShujiaApiSearchResult[]; total: number }> {
  const { 
    provider = 'mangaupdates', 
    limit = 30, 
    page = 1, 
    types,
    genres,
    orderby,
    showMatureContent = false,
    showExplicitContent = false,
    showPornographicContent = false,
    cache = true, 
    signal 
  } = options;
  
  try {
    const url = new URL('/manga/browse', SCRAPER_API_BASE);
    url.searchParams.set('provider', provider);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    url.searchParams.set('showMatureContent', String(showMatureContent));
    url.searchParams.set('showExplicitContent', String(showExplicitContent));
    url.searchParams.set('showPornographicContent', String(showPornographicContent));
    
    if (types && types.length > 0) {
      types.forEach(type => url.searchParams.append('types[]', type));
    }
    
    if (genres && genres.length > 0) {
      genres.forEach(genre => url.searchParams.append('genres[]', genre));
    }
    
    if (orderby) {
      url.searchParams.set('orderby', orderby);
    }
    
    if (!cache) {
      url.searchParams.set('cache', 'false');
    }
    
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[ShujiaAPI] Browse HTTP ${response.status}`);
      return { results: [], total: 0 };
    }
    
    const json: any = await response.json();
    
    if (!json.success || !json.data) {
      console.error(`[ShujiaAPI] Browse API error:`, json.error);
      return { results: [], total: 0 };
    }
    
    return {
      results: json.data,
      total: json.total || 0,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log(`[ShujiaAPI] Browse request aborted`);
      return { results: [], total: 0 };
    }
    
    console.error(`[ShujiaAPI] Browse error:`, error);
    return { results: [], total: 0 };
  }
}

