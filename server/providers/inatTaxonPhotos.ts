import type { Observation } from "../../src/types/observation";

const INAT_BASE_URL = "https://api.inaturalist.org/v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LOOKUP_CONCURRENCY = 5;
const USER_AGENT = "AnimalsNearMe/1.0";

type CacheEntry = {
  url: string | null;
  timestamp: number;
};

const photoCache = new Map<string, CacheEntry>();
const pendingLookups = new Map<string, Promise<string | null>>();

type InatDefaultPhoto = {
  medium_url?: string;
  square_url?: string;
  url?: string;
};

export function photoUrlFromDefaultPhoto(
  photo: InatDefaultPhoto | null | undefined
): string | undefined {
  if (!photo) {
    return undefined;
  }
  return photo.medium_url || photo.square_url || photo.url || undefined;
}

export function hasSightingPhoto(obs: Observation): boolean {
  return Boolean(obs.photoUrl) && obs.photoSource !== "taxon";
}

export function normalizeScientificName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCachedPhoto(key: string): string | null | undefined {
  const entry = photoCache.get(key);
  if (!entry) {
    return undefined;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    photoCache.delete(key);
    return undefined;
  }
  return entry.url;
}

function setCachedPhoto(key: string, url: string | null): void {
  photoCache.set(key, { url, timestamp: Date.now() });
  if (photoCache.size > 2000) {
    const entries = Array.from(photoCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 200 && i < entries.length; i++) {
      photoCache.delete(entries[i][0]);
    }
  }
}

function pickTaxonPhoto(
  results: Array<{ name?: string; default_photo?: InatDefaultPhoto }>,
  scientificName: string
): string | null {
  const target = normalizeScientificName(scientificName);
  const exact = results.find(
    (taxon) => taxon.name && normalizeScientificName(taxon.name) === target
  );
  const exactUrl = photoUrlFromDefaultPhoto(exact?.default_photo);
  if (exactUrl) {
    return exactUrl;
  }

  const prefix = results.find(
    (taxon) =>
      taxon.name &&
      normalizeScientificName(taxon.name).startsWith(target) &&
      photoUrlFromDefaultPhoto(taxon.default_photo)
  );
  const prefixUrl = photoUrlFromDefaultPhoto(prefix?.default_photo);
  if (prefixUrl) {
    return prefixUrl;
  }

  for (const taxon of results) {
    const url = photoUrlFromDefaultPhoto(taxon.default_photo);
    if (url) {
      return url;
    }
  }

  return null;
}

async function lookupTaxonPhoto(scientificName: string): Promise<string | null> {
  const key = normalizeScientificName(scientificName);
  if (!key) {
    return null;
  }

  const cached = getCachedPhoto(key);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pendingLookups.get(key);
  if (pending) {
    return pending;
  }

  const lookup = (async () => {
    try {
      const url = new URL(`${INAT_BASE_URL}/taxa`);
      url.searchParams.set("q", scientificName.replace(/\s*\([^)]*\)\s*/g, " ").trim());
      url.searchParams.set("is_active", "true");
      url.searchParams.set("per_page", "5");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const photoUrl = pickTaxonPhoto(data.results || [], scientificName);
      setCachedPhoto(key, photoUrl);
      return photoUrl;
    } catch (error) {
      console.error("Error looking up iNaturalist taxon photo:", error);
      return null;
    } finally {
      pendingLookups.delete(key);
    }
  })();

  pendingLookups.set(key, lookup);
  return lookup;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      await fn(items[index]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
}

function photoFromInatPayload(obs: Observation): string | undefined {
  return photoUrlFromDefaultPhoto(obs.raw?.taxon?.default_photo);
}

/**
 * Attach iNaturalist taxon default_photo as taxonPhotoUrl.
 * Fill photoUrl from that only when the sighting has no photo of its own.
 */
export async function enrichObservationPhotos(
  observations: Observation[]
): Promise<Observation[]> {
  const withPayloadPhotos = observations.map((obs) => {
    const taxonUrl = obs.taxonPhotoUrl || photoFromInatPayload(obs);
    if (!taxonUrl) {
      return obs;
    }

    const next: Observation = obs.taxonPhotoUrl
      ? obs
      : { ...obs, taxonPhotoUrl: taxonUrl };

    if (next.photoUrl) {
      return next;
    }

    return {
      ...next,
      photoUrl: taxonUrl,
      photoSource: "taxon" as const,
    };
  });

  const namesToLookup = [
    ...new Set(
      withPayloadPhotos
        .filter((obs) => !obs.taxonPhotoUrl && obs.scientificName)
        .map((obs) => obs.scientificName as string)
    ),
  ];

  const photosByName = new Map<string, string>();
  await mapPool(namesToLookup, LOOKUP_CONCURRENCY, async (name) => {
    const url = await lookupTaxonPhoto(name);
    if (url) {
      photosByName.set(normalizeScientificName(name), url);
    }
  });

  if (photosByName.size === 0) {
    return withPayloadPhotos;
  }

  return withPayloadPhotos.map((obs) => {
    if (obs.taxonPhotoUrl || !obs.scientificName) {
      return obs;
    }
    const url = photosByName.get(normalizeScientificName(obs.scientificName));
    if (!url) {
      return obs;
    }
    return {
      ...obs,
      taxonPhotoUrl: url,
      photoUrl: obs.photoUrl ?? url,
      photoSource: obs.photoUrl ? obs.photoSource : "taxon",
    };
  });
}
