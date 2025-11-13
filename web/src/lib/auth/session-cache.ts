/**
 * In-memory session cache for serverless functions
 * Dramatically reduces database queries for session lookups
 * Each serverless instance maintains its own cache
 */

interface CachedSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
  };
  expiresAt: number;
}

// In-memory cache map
const sessionCache = new Map<string, CachedSession>();

// Cache entries for 30 seconds
const CACHE_TTL = 30000;

// Max cache size to prevent memory leaks
const MAX_CACHE_SIZE = 1000;

/**
 * Get a cached session by token hash
 */
export function getCachedSession(tokenHash: string) {
  const cached = sessionCache.get(tokenHash);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  
  // Expired or not found
  if (cached) {
    sessionCache.delete(tokenHash);
  }
  
  return null;
}

/**
 * Cache a session lookup result
 */
export function setCachedSession(tokenHash: string, user: CachedSession["user"]) {
  // Cleanup if cache is too large
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    cleanupExpiredSessions();
    
    // If still too large, clear oldest entries
    if (sessionCache.size >= MAX_CACHE_SIZE) {
      const keysToDelete = Array.from(sessionCache.keys()).slice(0, 100);
      keysToDelete.forEach((key) => sessionCache.delete(key));
    }
  }
  
  sessionCache.set(tokenHash, {
    user,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Remove expired sessions from cache
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  
  for (const [key, value] of sessionCache.entries()) {
    if (value.expiresAt < now) {
      sessionCache.delete(key);
    }
  }
}

/**
 * Invalidate a specific session (e.g., on logout)
 */
export function invalidateCachedSession(tokenHash: string) {
  sessionCache.delete(tokenHash);
}

/**
 * Clear all cached sessions (e.g., for testing)
 */
export function clearSessionCache() {
  sessionCache.clear();
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

