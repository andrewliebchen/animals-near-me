import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCached, setCached } from "../../server/utils/cache";

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/api/rest_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface WikipediaCacheEntry {
  data: any;
  timestamp: number;
}

const wikipediaCache = new Map<string, WikipediaCacheEntry>();

function getWikipediaCacheKey(title: string): string {
  return `wikipedia:${title.toLowerCase()}`;
}

function getCachedWikipedia(key: string): any | null {
  const entry = wikipediaCache.get(key);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    wikipediaCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedWikipedia(key: string, data: any): void {
  wikipediaCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  // Clean up old entries periodically
  if (wikipediaCache.size > 100) {
    const entries = Array.from(wikipediaCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20 entries
    for (let i = 0; i < 20 && i < entries.length; i++) {
      wikipediaCache.delete(entries[i][0]);
    }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const title = req.query.title as string;

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        error: "Invalid parameters. Required: title",
      });
    }

    // Check cache first
    const cacheKey = getWikipediaCacheKey(title);
    const cached = getCachedWikipedia(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    // Normalize title: replace spaces with underscores (Wikipedia standard format)
    // Wikipedia REST API accepts underscores in the path
    let normalizedTitle = title.trim().replace(/\s+/g, "_");
    
    // Encode the title for URL (this will encode special chars but Wikipedia handles it)
    // Note: Wikipedia API accepts both encoded and unencoded titles with underscores
    const encodedTitle = encodeURIComponent(normalizedTitle);

    // Fetch from Wikipedia REST API
    const wikipediaUrl = `${WIKIPEDIA_API_BASE}/page/summary/${encodedTitle}`;
    
    const response = await fetch(wikipediaUrl, {
      headers: {
        "User-Agent": "AnimalsNearMe/1.0 (https://github.com/yourusername/animals-near-me)",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Article not found - return null but don't cache
        return res.status(404).json({ error: "Article not found" });
      }
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the successful response
    setCachedWikipedia(cacheKey, data);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in Wikipedia endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

