/**
 * Simple in-memory cache for observations
 * Key: viewport-based string
 * Value: observations array with timestamp
 */

interface CacheEntry {
  observations: any[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from viewport
 */
export function getCacheKey(
  lat: number,
  lng: number,
  latDelta: number,
  lngDelta: number
): string {
  // Round to reduce cache fragmentation
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const roundedLatDelta = Math.round(latDelta * 1000) / 1000;
  const roundedLngDelta = Math.round(lngDelta * 1000) / 1000;
  
  return `${roundedLat},${roundedLng},${roundedLatDelta},${roundedLngDelta}`;
}

/**
 * Get cached observations
 */
export function getCached(key: string): any[] | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.observations;
}

/**
 * Set cached observations
 */
export function setCached(key: string, observations: any[]): void {
  cache.set(key, {
    observations,
    timestamp: Date.now(),
  });

  // Clean up old entries periodically (keep cache size reasonable)
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20 entries
    for (let i = 0; i < 20 && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
}

