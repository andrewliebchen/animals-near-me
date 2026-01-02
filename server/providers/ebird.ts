import type { CenterRadius } from "../utils/viewport";
import { normalizeEbird } from "./normalize";
import type { Observation } from "../../src/types/observation";

const EBIRD_BASE_URL = "https://api.ebird.org/v2";
const MAX_RADIUS_KM = 50;

interface FetchEbirdOptions {
  center: { lat: number; lng: number };
  radiusKm: number;
  backDays?: number;
}

/**
 * Fetch recent eBird observations
 * Handles tiling when radius > 50km
 */
export async function fetchRecentEbird(
  options: FetchEbirdOptions
): Promise<Observation[]> {
  const { center, radiusKm, backDays = 7 } = options;
  const apiKey = process.env.EBIRD_API_KEY;

  if (!apiKey) {
    throw new Error("EBIRD_API_KEY environment variable is required");
  }

  // If radius is within limit, fetch directly
  if (radiusKm <= MAX_RADIUS_KM) {
    return await fetchEbirdSingle(center, radiusKm, backDays, apiKey);
  }

  // Otherwise, tile the viewport
  const tiles = createTiles(center, radiusKm);
  const results = await Promise.all(
    tiles.map((tileCenter) =>
      fetchEbirdSingle(tileCenter, MAX_RADIUS_KM, backDays, apiKey)
    )
  );

  // Flatten and return
  return results.flat();
}

/**
 * Fetch from a single center point
 */
async function fetchEbirdSingle(
  center: { lat: number; lng: number },
  radiusKm: number,
  backDays: number,
  apiKey: string
): Promise<Observation[]> {
  const url = new URL(`${EBIRD_BASE_URL}/data/obs/geo/recent`);
  url.searchParams.set("lat", center.lat.toString());
  url.searchParams.set("lng", center.lng.toString());
  url.searchParams.set("dist", Math.min(radiusKm, MAX_RADIUS_KM).toString());
  url.searchParams.set("back", Math.min(backDays, 30).toString());
  url.searchParams.set("maxResults", "100");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "x-ebirdapitoken": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`eBird API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeEbird) : [];
  } catch (error) {
    console.error("Error fetching eBird data:", error);
    return [];
  }
}

/**
 * Create tile centers for large viewports
 * Divides viewport into 2x2 or 3x3 grid depending on size
 */
function createTiles(
  center: { lat: number; lng: number },
  radiusKm: number
): Array<{ lat: number; lng: number }> {
  // Determine grid size based on radius
  const gridSize = radiusKm > 100 ? 3 : 2;
  const tileSpacing = (radiusKm * 2) / gridSize;
  
  const tiles: Array<{ lat: number; lng: number }> = [];
  
  // Create grid of centers
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const offsetLat = ((i - (gridSize - 1) / 2) * tileSpacing) / 111; // Convert km to degrees
      const offsetLng = ((j - (gridSize - 1) / 2) * tileSpacing) / (111 * Math.cos(center.lat * Math.PI / 180));
      
      tiles.push({
        lat: center.lat + offsetLat,
        lng: center.lng + offsetLng,
      });
    }
  }
  
  return tiles;
}


