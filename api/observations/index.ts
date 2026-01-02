import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRecentEbird } from "../../server/providers/ebird";
import { fetchInat } from "../../server/providers/inat";
import { viewportToBoundingBox, viewportToCenterRadius } from "../../server/utils/viewport";
import { deduplicateObservations } from "../../server/utils/dedupe";
import { getCacheKey, getCached, setCached } from "../../server/utils/cache";
import type { Observation, Provider, TaxaBucket } from "../../src/types/observation";
import type { FilterParams, RecencyFilter } from "../../src/types/filters";

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

    // Parse filter parameters
    const filters: FilterParams = {
      recency: (req.query.recency as RecencyFilter) || null,
      hasPhoto: req.query.hasPhoto
        ? req.query.hasPhoto === "true"
        : null,
      taxa: req.query.taxa
        ? (req.query.taxa as string).split(",").filter((t): t is TaxaBucket => {
            const validTaxa: TaxaBucket[] = [
              "Bird",
              "Mammal",
              "Reptile",
              "Amphibian",
              "Fish",
              "Insect",
              "Arachnid",
              "Mollusk",
              "Plant",
              "Fungi",
              "Other",
            ];
            return validTaxa.includes(t as TaxaBucket);
          })
        : [],
      provider: req.query.provider
        ? (req.query.provider as string)
            .split(",")
            .filter((p): p is Provider => p === "ebird" || p === "inat")
        : [],
    };

    // Validate recency filter
    if (
      filters.recency &&
      !["today", "this_week", "this_month"].includes(filters.recency)
    ) {
      return res.status(400).json({
        error: "Invalid recency filter. Must be: today, this_week, or this_month",
      });
    }

    const viewport = { lat, lng, latDelta, lngDelta };

    // Check cache first (with filters)
    const cacheKey = getCacheKey(lat, lng, latDelta, lngDelta, filters);
    const cached = getCached(cacheKey);
    
    if (cached) {
      return res.status(200).json({
        observations: cached,
      });
    }

    // Convert viewport to bounding box and center+radius
    const bbox = viewportToBoundingBox(viewport);
    const centerRadius = viewportToCenterRadius(viewport);

    // Map recency filter to days
    const recencyDays: Record<RecencyFilter, number> = {
      today: 1,
      this_week: 7,
      this_month: 30,
      null: 7, // default
    };
    const backDays = filters.recency
      ? recencyDays[filters.recency]
      : 7;
    const recentDays = filters.recency
      ? recencyDays[filters.recency]
      : 14;

    // Determine which providers to fetch
    const shouldFetchEbird =
      filters.provider.length === 0 || filters.provider.includes("ebird");
    const shouldFetchInat =
      filters.provider.length === 0 || filters.provider.includes("inat");

    // eBird doesn't provide photos, so skip if hasPhoto filter requires photos
    const shouldFetchEbirdWithPhotoFilter =
      shouldFetchEbird && !(filters.hasPhoto === true);

    // Fetch from providers in parallel
    const ebirdPromise = shouldFetchEbirdWithPhotoFilter
      ? fetchRecentEbird({
          center: centerRadius.center,
          radiusKm: centerRadius.radiusKm,
          backDays,
        })
      : Promise.resolve<Observation[]>([]);

    const inatPromise = shouldFetchInat
      ? fetchInat({
          bbox,
          center: centerRadius.center,
          radiusKm: centerRadius.radiusKm,
          recentDays,
          hasPhotos: filters.hasPhoto === true ? true : filters.hasPhoto === false ? false : undefined,
        })
      : Promise.resolve<Observation[]>([]);

    const [ebirdObservations, inatObservations] = await Promise.all([
      ebirdPromise,
      inatPromise,
    ]);

    // Combine and deduplicate
    const allObservations: Observation[] = [
      ...ebirdObservations,
      ...inatObservations,
    ];

    const deduplicated = deduplicateObservations(allObservations);

    // Apply filters after fetching
    let filtered = deduplicated;

    // Filter by taxa
    if (filters.taxa.length > 0) {
      filtered = filtered.filter((obs) =>
        filters.taxa.includes(obs.taxaBucket)
      );
    }

    // Filter by provider (already handled in fetch, but double-check)
    if (filters.provider.length > 0) {
      filtered = filtered.filter((obs) =>
        filters.provider.includes(obs.provider)
      );
    }

    // Filter by photo
    if (filters.hasPhoto === true) {
      filtered = filtered.filter((obs) => obs.photoUrl !== undefined);
    } else if (filters.hasPhoto === false) {
      filtered = filtered.filter((obs) => obs.photoUrl === undefined);
    }

    // Cache the results
    setCached(cacheKey, filtered);

    // Return clean observations
    return res.status(200).json({
      observations: filtered,
    });
  } catch (error) {
    console.error("Error in observations endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

