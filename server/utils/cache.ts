/**
 * Simple in-memory cache for observations
 * Key: viewport-based string + filters
 * Value: observations array with timestamp
 */

import type { FilterParams } from "../../src/types/filters";

interface CacheEntry {
  observations: any[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from viewport and optional filters
 */
export function getCacheKey(
  lat: number,
  lng: number,
  latDelta: number,
  lngDelta: number,
  filters?: FilterParams
): string {
  // Round to reduce cache fragmentation
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const roundedLatDelta = Math.round(latDelta * 1000) / 1000;
  const roundedLngDelta = Math.round(lngDelta * 1000) / 1000;
  
  let key = `${roundedLat},${roundedLng},${roundedLatDelta},${roundedLngDelta}`;
  
  // Add filter parameters to cache key if provided
  if (filters) {
    const filterParts: string[] = [];
    
    if (filters.recency) {
      filterParts.push(`recency:${filters.recency}`);
    }
    if (filters.hasPhoto !== null) {
      filterParts.push(`hasPhoto:${filters.hasPhoto}`);
    }
    if (filters.taxa.length > 0) {
      // Sort taxa for consistent cache keys
      const sortedTaxa = [...filters.taxa].sort().join(",");
      filterParts.push(`taxa:${sortedTaxa}`);
    }
    if (filters.provider.length > 0) {
      // Sort providers for consistent cache keys
      const sortedProvider = [...filters.provider].sort().join(",");
      filterParts.push(`provider:${sortedProvider}`);
    }
    
    if (filterParts.length > 0) {
      key += `|${filterParts.join("|")}`;
    }
  }
  
  return key;
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

