import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRecentEbird } from "../../server/providers/ebird";
import { fetchInat } from "../../server/providers/inat";
import { viewportToBoundingBox, viewportToCenterRadius } from "../../server/utils/viewport";
import { deduplicateObservations } from "../../server/utils/dedupe";
import { getCacheKey, getCached, setCached } from "../../server/utils/cache";
import type { Observation } from "../../src/types/observation";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse query parameters
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const latDelta = parseFloat(req.query.latDelta as string);
    const lngDelta = parseFloat(req.query.lngDelta as string);

    // Validate parameters
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      isNaN(latDelta) ||
      isNaN(lngDelta) ||
      latDelta <= 0 ||
      lngDelta <= 0
    ) {
      return res.status(400).json({
        error: "Invalid parameters. Required: lat, lng, latDelta, lngDelta",
      });
    }

    const viewport = { lat, lng, latDelta, lngDelta };

    // Check cache first
    const cacheKey = getCacheKey(lat, lng, latDelta, lngDelta);
    const cached = getCached(cacheKey);
    
    if (cached) {
      return res.status(200).json({
        observations: cached,
      });
    }

    // Convert viewport to bounding box and center+radius
    const bbox = viewportToBoundingBox(viewport);
    const centerRadius = viewportToCenterRadius(viewport);

    // Fetch from both providers in parallel
    const [ebirdObservations, inatObservations] = await Promise.all([
      fetchRecentEbird({
        center: centerRadius.center,
        radiusKm: centerRadius.radiusKm,
        backDays: 7,
      }),
      fetchInat({
        bbox,
        center: centerRadius.center,
        radiusKm: centerRadius.radiusKm,
        recentDays: 14,
      }),
    ]);

    // Combine and deduplicate
    const allObservations: Observation[] = [
      ...ebirdObservations,
      ...inatObservations,
    ];

    const deduplicated = deduplicateObservations(allObservations);

    // Cache the results
    setCached(cacheKey, deduplicated);

    // Return clean observations
    return res.status(200).json({
      observations: deduplicated,
    });
  } catch (error) {
    console.error("Error in observations endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

