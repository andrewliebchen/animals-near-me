import type { Observation } from "../../src/types/observation";
import { distanceKm } from "./viewport";

/**
 * Deduplicate observations by provider+id and spatial proximity
 * Removes duplicates where same species is within ~30m of each other
 */
export function deduplicateObservations(
  observations: Observation[]
): Observation[] {
  const seen = new Set<string>();
  const result: Observation[] = [];
  const DEDUPE_DISTANCE_M = 0.03; // 30 meters in km

  for (const obs of observations) {
    // First check: exact ID match
    if (seen.has(obs.id)) {
      continue;
    }

    // Second check: spatial + species deduplication
    const isDuplicate = result.some((existing) => {
      const sameSpecies =
        existing.commonName === obs.commonName ||
        existing.scientificName === obs.scientificName;
      
      if (!sameSpecies) {
        return false;
      }

      const dist = distanceKm(
        existing.lat,
        existing.lng,
        obs.lat,
        obs.lng
      );

      return dist < DEDUPE_DISTANCE_M;
    });

    if (!isDuplicate) {
      seen.add(obs.id);
      result.push(obs);
    }
  }

  return result;
}



