import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Observation } from "../types/observation";
import type { Region } from "react-native-maps";
import { fetchObservations } from "../api/client";
import { regionToViewportParams } from "../utils/viewport";
import type { FilterParams } from "../types/filters";
import { DEFAULT_FILTERS } from "../types/filters";

// Module-level abort controller for request cancellation
let viewportAbortController: AbortController | null = null;

interface ObservationState {
  observations: Observation[];
  selectedObservation: Observation | null;
  viewport: Region | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filters: FilterParams;
  
  // Actions
  setObservations: (observations: Observation[]) => void;
  setSelectedObservation: (observation: Observation | null) => void;
  setViewport: (viewport: Region) => void;
  setFilters: (filters: FilterParams) => void;
  fetchObservationsForViewport: (viewport: Region, userLocation?: { latitude: number; longitude: number }) => Promise<void>;
  clearError: () => void;
}

export const useObservationStore = create<ObservationState>()(
  persist(
    (set, get) => ({
      observations: [],
      selectedObservation: null,
      viewport: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      filters: DEFAULT_FILTERS,

      setObservations: (observations) => set({ observations }),

      setSelectedObservation: (observation) => set({ selectedObservation: observation }),

      setViewport: (viewport) => set({ viewport }),

      setFilters: (filters: FilterParams) => {
        const currentFilters = get().filters;
        set({ filters });
        
        // If filters changed, clear observations and refetch for current viewport
        const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(filters);
        if (filtersChanged && get().viewport) {
          set({ observations: [] }); // Clear to trigger refetch
          get().fetchObservationsForViewport(get().viewport!);
        }
      },

      fetchObservationsForViewport: async (viewport: Region, userLocation?: { latitude: number; longitude: number }) => {
        // Cancel previous request if exists
        if (viewportAbortController) {
          viewportAbortController.abort();
        }
        
        // Create new abort controller
        viewportAbortController = new AbortController();
        const signal = viewportAbortController.signal;
        
        set({ isLoading: true, error: null });
        
        try {
          const viewportParams = regionToViewportParams(viewport);
          const filters = get().filters;
          const newObservations = await fetchObservations(
            viewportParams, 
            filters,
            {
              userLocation,
              limit: 1000, // Limit for map view
              signal,
            }
          );
          
          // Check if request was aborted
          if (signal.aborted) {
            return;
          }
          
          // When userLocation is provided, replace observations to maintain server-side sorting
          // When userLocation is not provided, merge to preserve cluster counts when zooming
          const existingObservations = get().observations;
          let mergedObservations: Observation[];
          
          if (userLocation) {
            // For feed view: replace with new observations to maintain distance-based sorting
            // The server has already sorted by distance, so we should preserve that order
            const observationMap = new Map<string, Observation>();
            
            // Add new observations first (they're already sorted by distance from server)
            newObservations.forEach(obs => {
              observationMap.set(obs.id, obs);
            });
            
            // Only add existing observations that aren't in the new set (for continuity)
            // But we need to re-sort to maintain distance order
            existingObservations.forEach(obs => {
              if (!observationMap.has(obs.id)) {
                observationMap.set(obs.id, obs);
              }
            });
            
            // Convert to array and re-sort by distance to maintain correct order
            mergedObservations = Array.from(observationMap.values());
            mergedObservations.sort((a, b) => {
              const distA = a.distance ?? Infinity;
              const distB = b.distance ?? Infinity;
              return distA - distB;
            });
          } else {
            // For map view: merge to preserve cluster counts when zooming
            const observationMap = new Map<string, Observation>();
            // Add existing observations to map
            existingObservations.forEach(obs => {
              observationMap.set(obs.id, obs);
            });
            // Add/update with new observations
            newObservations.forEach(obs => {
              observationMap.set(obs.id, obs);
            });
            // Convert back to array (order doesn't matter for map view)
            mergedObservations = Array.from(observationMap.values());
          }
          
          set({ observations: mergedObservations, viewport, isLoading: false });
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch observations";
          set({ error: errorMessage, isLoading: false });
          console.error("Error fetching observations:", error);
        }
      },

      clearError: () => set({ error: null }),

    }),
    {
      name: "observation-filters-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);

