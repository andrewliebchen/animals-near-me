import type { Observation, Provider, TaxaBucket } from "../../src/types/observation";

/**
 * Map iNaturalist iconic_taxon_name to TaxaBucket
 */
function mapInatTaxa(iconicTaxonName?: string): TaxaBucket {
  if (!iconicTaxonName) return "Other";
  
  const mapping: Record<string, TaxaBucket> = {
    Aves: "Bird",
    Mammalia: "Mammal",
    Reptilia: "Reptile",
    Amphibia: "Amphibian",
    Actinopterygii: "Fish",
    Insecta: "Insect",
    Arachnida: "Arachnid",
    Mollusca: "Mollusk",
    Plantae: "Plant",
    Fungi: "Fungi",
  };

  return mapping[iconicTaxonName] || "Other";
}

/**
 * Normalize eBird observation to Observation type
 */
export function normalizeEbird(ebirdData: any): Observation {
  const id = `ebird-${ebirdData.obsId || ebirdData.subId || Date.now()}`;
  
  return {
    id,
    provider: "ebird" as Provider,
    lat: ebirdData.lat,
    lng: ebirdData.lng,
    observedAt: ebirdData.obsDt || ebirdData.obsDateTime,
    placeGuess: ebirdData.locName,
    commonName: ebirdData.comName,
    scientificName: ebirdData.sciName,
    taxaBucket: "Bird" as TaxaBucket, // eBird is always birds
    photoUrl: undefined, // eBird doesn't provide photos in recent endpoint
    detailUrl: ebirdData.speciesCode
      ? `https://ebird.org/species/${ebirdData.speciesCode}`
      : undefined,
    raw: ebirdData,
  };
}

/**
 * Normalize iNaturalist observation to Observation type
 */
export function normalizeInat(inatData: any): Observation {
  const id = `inat-${inatData.id}`;
  const taxon = inatData.taxon || {};
  const photos = inatData.photos || [];
  const bestPhoto = photos[0] || {};
  
  // Get photo URL (prefer medium, fallback to small)
  let photoUrl: string | undefined;
  if (bestPhoto.url) {
    photoUrl = bestPhoto.url.replace("square", "medium") || bestPhoto.url;
  }

  return {
    id,
    provider: "inat" as Provider,
    lat: inatData.location ? parseFloat(inatData.location.split(",")[0]) : 0,
    lng: inatData.location ? parseFloat(inatData.location.split(",")[1]) : 0,
    observedAt: inatData.observed_on_string
      ? new Date(inatData.observed_on_string).toISOString()
      : inatData.time_observed_at,
    placeGuess: inatData.place_guess,
    commonName: taxon.preferred_common_name || taxon.name,
    scientificName: taxon.name,
    taxaBucket: mapInatTaxa(taxon.iconic_taxon_name),
    photoUrl,
    detailUrl: `https://www.inaturalist.org/observations/${inatData.id}`,
    raw: inatData,
  };
}

