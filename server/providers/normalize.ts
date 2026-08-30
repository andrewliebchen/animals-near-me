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

/**
 * Map WoRMS class/phylum to TaxaBucket
 */
function mapObisTaxa(className?: string, phylum?: string, kingdom?: string): TaxaBucket {
  const classMapping: Record<string, TaxaBucket> = {
    Aves: "Bird",
    Mammalia: "Mammal",
    Reptilia: "Reptile",
    Amphibia: "Amphibian",
    Actinopterygii: "Fish",
    Elasmobranchii: "Fish",
    Chondrostei: "Fish",
    Chondrichthyes: "Fish",
    Teleostei: "Fish",
    Actinopteri: "Fish",
    Myxini: "Fish",
    Petromyzonti: "Fish",
    Insecta: "Insect",
    Arachnida: "Arachnid",
    Gastropoda: "Mollusk",
    Bivalvia: "Mollusk",
    Cephalopoda: "Mollusk",
    Polyplacophora: "Mollusk",
  };

  if (className && classMapping[className]) {
    return classMapping[className];
  }

  if (phylum === "Mollusca") return "Mollusk";
  if (kingdom === "Plantae") return "Plant";
  if (kingdom === "Fungi") return "Fungi";

  return "Other";
}

function firstMediaUrl(associatedMedia: unknown): string | undefined {
  if (!associatedMedia) {
    return undefined;
  }
  const text = Array.isArray(associatedMedia)
    ? associatedMedia.join(" ")
    : String(associatedMedia);
  const match = text.match(/https?:\/\/[^\s|,;"]+/i);
  return match?.[0];
}

function formatObisPlace(locality?: string, datasetName?: string): string | undefined {
  if (locality) {
    const station = locality.match(/STATION:([A-Za-z0-9_]+)/i);
    if (station) {
      return station[1].replace(/_/g, " ");
    }
    if (!locality.includes("LINE\\ARRAY") && !locality.includes("LINE/ARRAY")) {
      return locality;
    }
  }
  return datasetName;
}

function toIsoDate(eventDate?: string): string | undefined {
  if (!eventDate) {
    return undefined;
  }
  const parsed = new Date(eventDate.includes("T") ? eventDate : eventDate.replace(" ", "T"));
  if (isNaN(parsed.getTime())) {
    return eventDate;
  }
  return parsed.toISOString();
}

/**
 * Normalize an OBIS occurrence to Observation type
 */
export function normalizeObis(obisData: any): Observation | null {
  const obisId = obisData.id;
  const lat = Number(obisData.decimalLatitude);
  const lng = Number(obisData.decimalLongitude);

  if (!obisId || !isFinite(lat) || !isFinite(lng)) {
    return null;
  }

  const aphiaId = obisData.aphiaID || obisData.AphiaID;
  const references = typeof obisData.references === "string" ? obisData.references : "";
  const detailUrl = /^https?:\/\//i.test(references)
    ? references
    : aphiaId
      ? `https://obis.org/taxon/${aphiaId}`
      : undefined;

  const locality = formatObisPlace(obisData.locality, obisData.datasetName);
  const isReceiverDetection = obisData.basisOfRecord === "MachineObservation";
  const placeGuess = isReceiverDetection && locality
    ? `Detected at receiver · ${locality}`
    : isReceiverDetection
      ? "Detected at receiver"
      : locality;

  return {
    id: `obis-${obisId}`,
    provider: "obis",
    lat,
    lng,
    observedAt: toIsoDate(obisData.eventDate),
    placeGuess,
    commonName: obisData.vernacularName || obisData.scientificName,
    scientificName: obisData.scientificName,
    taxaBucket: mapObisTaxa(obisData.class, obisData.phylum, obisData.kingdom),
    photoUrl: firstMediaUrl(obisData.associatedMedia),
    detailUrl,
    raw: obisData,
  };
}






