export type Provider = "inat" | "ebird" | "obis";

export type TaxaBucket =
  | "Bird"
  | "Mammal"
  | "Reptile"
  | "Amphibian"
  | "Fish"
  | "Insect"
  | "Arachnid"
  | "Mollusk"
  | "Plant"
  | "Fungi"
  | "Other";

export type Observation = {
  id: string; // provider + providerId
  provider: Provider;

  lat: number;
  lng: number;

  observedAt?: string; // ISO
  placeGuess?: string;

  commonName?: string;
  scientificName?: string;

  taxaBucket: TaxaBucket;

  photoUrl?: string;
  // "observation" = a photo from this sighting; "taxon" = iNat species default_photo fallback
  photoSource?: "observation" | "taxon";
  // iNaturalist taxon default_photo, when available (for the detail carousel)
  taxonPhotoUrl?: string;
  detailUrl?: string;

  // Server-calculated distance and bearing (optional)
  distance?: number; // Distance in km from user location
  bearing?: number; // Bearing in degrees (0-360) from user location

  raw: any; // Original API response for debugging
};

