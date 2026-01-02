import type { Provider, TaxaBucket } from "./observation";

export type RecencyFilter = "today" | "this_week" | "this_month" | null;

export interface FilterParams {
  recency: RecencyFilter;
  hasPhoto: boolean | null; // null = all, true = has photo, false = no photo
  taxa: TaxaBucket[]; // empty = all
  provider: Provider[]; // empty = all
}

export const DEFAULT_FILTERS: FilterParams = {
  recency: "this_week",
  hasPhoto: null,
  taxa: [],
  provider: ["ebird", "inat"], // Both providers selected by default
};

/**
 * Count the number of active filters
 */
export function countActiveFilters(filters: FilterParams): number {
  let count = 0;
  // Don't count default recency value
  if (filters.recency !== null && filters.recency !== "this_week") count++;
  if (filters.hasPhoto !== null) count++;
  if (filters.taxa.length > 0) count++;
  // Don't count providers when both are selected (default)
  if (filters.provider.length > 0 && filters.provider.length < 2) count++;
  return count;
}

