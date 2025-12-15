/**
 * Simple in-memory cache with TTL
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  
  constructor(ttlSeconds: number = 3600) {
    this.ttlMs = ttlSeconds * 1000;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  set(key: string, value: T, customTtlSeconds?: number): void {
    const ttl = customTtlSeconds ? customTtlSeconds * 1000 : this.ttlMs;
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }
}

// Singleton cache instances
export const mangaCache = new MemoryCache<any>(3600); // 1 hour
export const searchCache = new MemoryCache<any>(1800); // 30 minutes

