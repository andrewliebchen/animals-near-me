import type { BoundingBox } from "../utils/viewport";
import { normalizeInat } from "./normalize";
import type { Observation } from "../../src/types/observation";

const INAT_BASE_URL = "https://api.inaturalist.org/v1";

interface FetchInatOptions {
  bbox?: BoundingBox;
  center?: { lat: number; lng: number };
  radiusKm?: number;
  recentDays?: number;
  hasPhotos?: boolean; // true = has photos, false = no photos, undefined = all
}

/**
 * Fetch iNaturalist observations
 * Prefers bounding box query, falls back to center+radius
 */
export async function fetchInat(
  options: FetchInatOptions
): Promise<Observation[]> {
  const { bbox, center, radiusKm, recentDays = 14, hasPhotos } = options;

  const url = new URL(`${INAT_BASE_URL}/observations`);

  // Prefer bounding box if available
  if (bbox) {
    url.searchParams.set(
      "nelat",
      bbox.ne.lat.toString()
    );
    url.searchParams.set("nelng", bbox.ne.lng.toString());
    url.searchParams.set("swlat", bbox.sw.lat.toString());
    url.searchParams.set("swlng", bbox.sw.lng.toString());
  } else if (center && radiusKm) {
    // Fallback to center + radius approximation
    const radiusDeg = radiusKm / 111; // Rough conversion
    url.searchParams.set("lat", center.lat.toString());
    url.searchParams.set("lng", center.lng.toString());
    url.searchParams.set("radius", radiusDeg.toString());
  } else {
    throw new Error("Either bbox or center+radius must be provided");
  }

  // Filter parameters
  url.searchParams.set("per_page", "100");
  url.searchParams.set("quality_grade", "research,needs_id");
  // Only set has_photos if explicitly provided (true or false)
  if (hasPhotos !== undefined) {
    url.searchParams.set("has_photos", hasPhotos ? "true" : "false");
  }
  url.searchParams.set("geoprivacy", "open");
  
  // Date filter (recent observations)
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - recentDays);
  url.searchParams.set("d1", sinceDate.toISOString().split("T")[0]);

  // Request specific fields
  url.searchParams.set(
    "fields",
    "id,observed_on_string,time_observed_at,location,place_guess,taxon,photos"
  );

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const observations = data.results || [];
    
    return observations
      .filter((obs: any) => obs.location) // Only georeferenced
      .map(normalizeInat);
  } catch (error) {
    console.error("Error fetching iNaturalist data:", error);
    return [];
  }
}


