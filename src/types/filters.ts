import type { Provider, TaxaBucket } from "./observation";

export type RecencyFilter = "today" | "this_week" | "this_month" | null;

export interface FilterParams {
  recency: RecencyFilter;
  hasPhoto: boolean | null; // null = all, true = has photo, false = no photo
  taxa: TaxaBucket[]; // empty = all
  provider: Provider[]; // empty = all
}

export const DEFAULT_FILTERS: FilterParams = {
  recency: null,
  hasPhoto: null,
  taxa: [],
  provider: [],
};

/**
 * Count the number of active filters
 */
export function countActiveFilters(filters: FilterParams): number {
  let count = 0;
  if (filters.recency !== null) count++;
  if (filters.hasPhoto !== null) count++;
  if (filters.taxa.length > 0) count++;
  if (filters.provider.length > 0) count++;
  return count;
}

