/**
 * Caching utilities for MangaDex API calls
 * Uses Next.js unstable_cache for automatic revalidation
 */

import { unstable_cache } from "next/cache";

/**
 * Cache configuration for different types of data
 */
export const CACHE_CONFIG = {
  // Trending content changes frequently but not constantly
  TRENDING: {
    revalidate: 300, // 5 minutes
    tags: ["mangadex-trending"],
  },
  
  // Popular content is relatively stable
  POPULAR: {
    revalidate: 600, // 10 minutes
    tags: ["mangadex-popular"],
  },
  
  // Demographic highlights change slowly
  DEMOGRAPHIC: {
    revalidate: 600, // 10 minutes
    tags: ["mangadex-demographic"],
  },
  
  // Recent updates change frequently
  RECENT: {
    revalidate: 180, // 3 minutes
    tags: ["mangadex-recent"],
  },
  
  // Manga details are relatively static
  DETAILS: {
    revalidate: 3600, // 1 hour
    tags: ["mangadex-details"],
  },
  
  // Search results can be cached briefly
  SEARCH: {
    revalidate: 300, // 5 minutes
    tags: ["mangadex-search"],
  },
};

/**
 * Create a cached version of an async function
 * 
 * @param fn - The async function to cache
 * @param keyPrefix - Prefix for the cache key
 * @param config - Cache configuration (revalidate time and tags)
 * @returns Cached version of the function
 */
export function createCachedFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyPrefix: string,
  config: { revalidate: number; tags: string[] }
) {
  return unstable_cache(
    async (...args: TArgs) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(`Cache miss and fetch failed for ${keyPrefix}:`, error);
        throw error;
      }
    },
    [keyPrefix],
    {
      revalidate: config.revalidate,
      tags: config.tags,
    }
  );
}

/**
 * Generate a cache key from arguments
 */
export function generateCacheKey(prefix: string, ...args: unknown[]): string {
  return `${prefix}-${args.map((arg) => JSON.stringify(arg)).join("-")}`;
}

