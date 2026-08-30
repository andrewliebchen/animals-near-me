import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRecentEbird } from "../../server/providers/ebird";
import { fetchInat } from "../../server/providers/inat";
import { fetchRecentObis } from "../../server/providers/obis";
import { viewportToBoundingBox, viewportToCenterRadius, distanceKm, bearing } from "../../server/utils/viewport";
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

    // Optional user location for distance/bearing calculation
    const userLat = req.query.userLat ? parseFloat(req.query.userLat as string) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng as string) : null;

    // Optional limit parameter
    const limitParam = req.query.limit ? parseInt(req.query.limit as string) : null;
    const limit = limitParam && limitParam > 0 ? Math.min(limitParam, 1000) : null; // Max 1000

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

    // Validate user location if provided
    if (
      (userLat !== null && (isNaN(userLat) || !isFinite(userLat))) ||
      (userLng !== null && (isNaN(userLng) || !isFinite(userLng)))
    ) {
      return res.status(400).json({
        error: "Invalid user location parameters",
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
            .filter((p): p is Provider =>
              p === "ebird" || p === "inat" || p === "obis"
            )
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

    // Check cache first (with filters, but not user location - that's user-specific)
    // Only cache if user location is not provided
    const cacheKey = getCacheKey(lat, lng, latDelta, lngDelta, filters);
    const cached = userLat === null && userLng === null ? getCached(cacheKey) : null;
    
    if (cached) {
      // If limit is requested on cached data, apply it
      let result = cached;
      if (limit !== null && limit > 0) {
        // Sort by observedAt (most recent first) if no user location
        result = [...cached].sort((a, b) => {
          const dateA = a.observedAt ? new Date(a.observedAt).getTime() : 0;
          const dateB = b.observedAt ? new Date(b.observedAt).getTime() : 0;
          return dateB - dateA;
        }).slice(0, limit);
      }
      return res.status(200).json({
        observations: result,
        totalCount: cached.length,
        returnedCount: result.length,
        hasMore: limit !== null && cached.length > limit,
      });
    }

    // Convert viewport to bounding box and center+radius
    const bbox = viewportToBoundingBox(viewport);
    const centerRadius = viewportToCenterRadius(viewport);

    // Map recency filter to days
    const recencyDays: Record<Exclude<RecencyFilter, null>, number> = {
      today: 1,
      this_week: 7,
      this_month: 30,
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
    const shouldFetchObis =
      filters.provider.length === 0 || filters.provider.includes("obis");

    // eBird and OBIS rarely have photos, so skip if hasPhoto filter requires photos
    const shouldFetchEbirdWithPhotoFilter =
      shouldFetchEbird && !(filters.hasPhoto === true);
    const shouldFetchObisWithPhotoFilter =
      shouldFetchObis && !(filters.hasPhoto === true);

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

    const obisPromise = shouldFetchObisWithPhotoFilter
      ? fetchRecentObis({
          bbox,
          recentDays,
        })
      : Promise.resolve<Observation[]>([]);

    const [ebirdObservations, inatObservations, obisObservations] = await Promise.all([
      ebirdPromise,
      inatPromise,
      obisPromise,
    ]);

    // Combine and deduplicate
    const allObservations: Observation[] = [
      ...ebirdObservations,
      ...inatObservations,
      ...obisObservations,
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

    // Calculate distances and bearings if user location provided
    let processedObservations = filtered;
    if (userLat !== null && userLng !== null && isFinite(userLat) && isFinite(userLng)) {
      // Calculate distance and bearing for each observation
      processedObservations = filtered.map((obs) => {
        const dist = distanceKm(userLat, userLng, obs.lat, obs.lng);
        const bear = bearing(userLat, userLng, obs.lat, obs.lng);
        return {
          ...obs,
          distance: isNaN(dist) || !isFinite(dist) ? undefined : dist,
          bearing: isNaN(bear) || !isFinite(bear) ? undefined : bear,
        };
      });

      // Sort by distance (closest first)
      processedObservations.sort((a, b) => {
        const distA = a.distance ?? Infinity;
        const distB = b.distance ?? Infinity;
        return distA - distB;
      });
    } else if (limit !== null) {
      // If no user location but limit provided, sort by observedAt (most recent first)
      processedObservations = [...filtered].sort((a, b) => {
        const dateA = a.observedAt ? new Date(a.observedAt).getTime() : 0;
        const dateB = b.observedAt ? new Date(b.observedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    // Apply limit if provided
    const totalCount = processedObservations.length;
    let returnedObservations = processedObservations;
    if (limit !== null && limit > 0) {
      returnedObservations = processedObservations.slice(0, limit);
    }

    // Cache the results (only if no user location - user-specific data shouldn't be cached)
    if (userLat === null && userLng === null) {
      setCached(cacheKey, filtered); // Cache original filtered data without distance/bearing
    }

    // Return observations with metadata
    return res.status(200).json({
      observations: returnedObservations,
      totalCount,
      returnedCount: returnedObservations.length,
      hasMore: limit !== null && totalCount > limit,
    });
  } catch (error) {
    console.error("Error in observations endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

