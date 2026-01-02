import { create } from "zustand";
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
  error: string | null;
  filters: FilterParams;
  
  // Actions
  setObservations: (observations: Observation[]) => void;
  setSelectedObservation: (observation: Observation | null) => void;
  setViewport: (viewport: Region) => void;
  setFilters: (filters: FilterParams) => void;
  fetchObservationsForViewport: (viewport: Region) => Promise<void>;
  clearError: () => void;
}

export const useObservationStore = create<ObservationState>((set, get) => ({
  observations: [],
  selectedObservation: null,
  viewport: null,
  isLoading: false,
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
}));

