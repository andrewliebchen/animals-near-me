import type { TaxaBucket } from "../types/observation";

/**
 * Color palette for taxa buckets
 */
export const TAXA_COLORS: Record<TaxaBucket, string> = {
  Bird: "#3B82F6", // Blue
  Mammal: "#92400E", // Brown
  Reptile: "#10B981", // Green
  Amphibian: "#14B8A6", // Teal
  Fish: "#06B6D4", // Cyan
  Insect: "#EAB308", // Yellow
  Arachnid: "#F97316", // Orange
  Mollusk: "#A855F7", // Purple
  Plant: "#059669", // Dark Green
  Fungi: "#EC4899", // Pink
  Other: "#6B7280", // Gray
};

/**
 * Get color for a taxa bucket
 */
export function getTaxaColor(taxaBucket: TaxaBucket): string {
  return TAXA_COLORS[taxaBucket] || TAXA_COLORS.Other;
}

