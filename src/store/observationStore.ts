import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Observation } from "../types/observation";
import type { Region } from "react-native-maps";
import { fetchObservations } from "../api/client";
import { regionToViewportParams } from "../utils/viewport";
import type { FilterParams } from "../types/filters";
import { DEFAULT_FILTERS } from "../types/filters";

interface ObservationState {
  observations: Observation[];
  selectedObservation: Observation | null;
  viewport: Region | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filters: FilterParams;
  feedRadiusKm: number; // Current search radius for feed view
  
  // Actions
  setObservations: (observations: Observation[]) => void;
  setSelectedObservation: (observation: Observation | null) => void;
  setViewport: (viewport: Region) => void;
  setFilters: (filters: FilterParams) => void;
  fetchObservationsForViewport: (viewport: Region) => Promise<void>;
  fetchMoreObservationsForFeed: (userLocation: { latitude: number; longitude: number }) => Promise<void>;
  clearError: () => void;
  resetFeedRadius: () => void;
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
      feedRadiusKm: 5, // Start with 5km radius

      setObservations: (observations) => set({ observations }),

      setSelectedObservation: (observation) => set({ selectedObservation: observation }),

      setViewport: (viewport) => set({ viewport }),

      setFilters: (filters: FilterParams) => {
        const currentFilters = get().filters;
        set({ filters, feedRadiusKm: 5 }); // Reset radius when filters change
        
        // If filters changed, clear observations and refetch for current viewport
        const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(filters);
        if (filtersChanged && get().viewport) {
          set({ observations: [] }); // Clear to trigger refetch
          get().fetchObservationsForViewport(get().viewport!);
        }
      },

      fetchObservationsForViewport: async (viewport: Region) => {
        set({ isLoading: true, error: null });
        
        try {
          const viewportParams = regionToViewportParams(viewport);
          const filters = get().filters;
          const newObservations = await fetchObservations(viewportParams, filters);
          
          // Merge with existing observations instead of replacing
          // This ensures cluster counts remain accurate when zooming
          const existingObservations = get().observations;
          const observationMap = new Map<string, Observation>();
          
          // Add existing observations to map
          existingObservations.forEach(obs => {
            observationMap.set(obs.id, obs);
          });
          
          // Add/update with new observations
          newObservations.forEach(obs => {
            observationMap.set(obs.id, obs);
          });
          
          // Convert back to array
          const mergedObservations = Array.from(observationMap.values());
          
          set({ observations: mergedObservations, viewport, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch observations";
          set({ error: errorMessage, isLoading: false });
          console.error("Error fetching observations:", error);
        }
      },

      clearError: () => set({ error: null }),

      resetFeedRadius: () => set({ feedRadiusKm: 5 }),

      fetchMoreObservationsForFeed: async (userLocation: { latitude: number; longitude: number }) => {
        const currentState = get();
        if (currentState.isLoadingMore || currentState.isLoading) {
          return; // Don't fetch if already loading
        }

        set({ isLoadingMore: true, error: null });
        
        try {
          // Expand radius by 5km each time
          const newRadius = currentState.feedRadiusKm + 5;
          
          // Create a viewport that represents the expanded search area
          // Convert radius (km) to approximate degrees (1 degree ≈ 111 km)
          const radiusDeg = newRadius / 111;
          const expandedViewport: Region = {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: radiusDeg * 2,
            longitudeDelta: radiusDeg * 2,
          };

          const viewportParams = regionToViewportParams(expandedViewport);
          const filters = currentState.filters;
          const newObservations = await fetchObservations(viewportParams, filters);
          
          // Merge with existing observations
          const existingObservations = currentState.observations;
          const observationMap = new Map<string, Observation>();
          
          // Add existing observations to map
          existingObservations.forEach(obs => {
            observationMap.set(obs.id, obs);
          });
          
          // Add/update with new observations
          newObservations.forEach(obs => {
            observationMap.set(obs.id, obs);
          });
          
          // Convert back to array
          const mergedObservations = Array.from(observationMap.values());
          
          set({ 
            observations: mergedObservations, 
            feedRadiusKm: newRadius,
            isLoadingMore: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch more observations";
          set({ error: errorMessage, isLoadingMore: false });
          console.error("Error fetching more observations:", error);
        }
      },
    }),
    {
      name: "observation-filters-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);

