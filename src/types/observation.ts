export type Provider = "inat" | "ebird";

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
  detailUrl?: string;

  raw: any; // Original API response for debugging
};

