// Simple in-memory cache for MangaUpdates API responses
// This helps reduce API calls for frequently accessed data

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;

  constructor(ttlMs: number = 1000 * 60 * 60) {
    // Default 1 hour
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global caches
let seriesCache: SimpleCache<unknown> | null = null;
let searchCache: SimpleCache<unknown[]> | null = null;

export function getSeriesCache(): SimpleCache<unknown> {
  if (!seriesCache) {
    seriesCache = new SimpleCache(1000 * 60 * 60 * 24); // 24 hours
  }
  return seriesCache;
}

export function getSearchCache(): SimpleCache<unknown[]> {
  if (!searchCache) {
    searchCache = new SimpleCache(1000 * 60 * 60 * 12); // 12 hours
  }
  return searchCache;
}

