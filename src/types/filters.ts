import type { Provider, TaxaBucket } from "./observation";

export type RecencyFilter = "today" | "this_week" | "this_month" | null;

export interface FilterParams {
  recency: RecencyFilter;
  hasPhoto: boolean | null; // null = all, true = has photo, false = no photo
  taxa: TaxaBucket[]; // empty = all
  provider: Provider[]; // empty = all
  showNewOnly?: boolean; // If true, only show observations that haven't been seen
  schemaVersion?: number;
}

export const ALL_PROVIDERS: Provider[] = ["ebird", "inat", "obis"];
export const FILTERS_SCHEMA_VERSION = 2;

export const DEFAULT_FILTERS: FilterParams = {
  recency: "this_week",
  hasPhoto: null,
  taxa: [],
  provider: [...ALL_PROVIDERS],
  showNewOnly: false,
  schemaVersion: FILTERS_SCHEMA_VERSION,
};

function allProvidersSelected(providers: Provider[]): boolean {
  return (
    providers.length === 0 ||
    ALL_PROVIDERS.every((provider) => providers.includes(provider))
  );
}

/**
 * Count the number of active filters
 */
export function countActiveFilters(filters: FilterParams): number {
  let count = 0;
  // Don't count default recency value
  if (filters.recency !== null && filters.recency !== "this_week") count++;
  if (filters.hasPhoto !== null) count++;
  if (filters.taxa.length > 0) count++;
  // Don't count providers when all sources are selected (default)
  if (filters.provider.length > 0 && !allProvidersSelected(filters.provider)) count++;
  if (filters.showNewOnly) count++;
  return count;
}

