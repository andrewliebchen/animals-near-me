import { create } from "zustand";
import type { Observation } from "../types/observation";
import type { Region } from "react-native-maps";
import { fetchObservations } from "../api/client";
import { regionToViewportParams } from "../utils/viewport";

interface ObservationState {
  observations: Observation[];
  selectedObservation: Observation | null;
  viewport: Region | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setObservations: (observations: Observation[]) => void;
  setSelectedObservation: (observation: Observation | null) => void;
  setViewport: (viewport: Region) => void;
  fetchObservationsForViewport: (viewport: Region) => Promise<void>;
  clearError: () => void;
}

export const useObservationStore = create<ObservationState>((set, get) => ({
  observations: [],
  selectedObservation: null,
  viewport: null,
  isLoading: false,
  error: null,

  setObservations: (observations) => set({ observations }),

  setSelectedObservation: (observation) => set({ selectedObservation: observation }),

  setViewport: (viewport) => set({ viewport }),

  fetchObservationsForViewport: async (viewport: Region) => {
    set({ isLoading: true, error: null });
    
    try {
      const viewportParams = regionToViewportParams(viewport);
      const observations = await fetchObservations(viewportParams);
      set({ observations, viewport, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch observations";
      set({ error: errorMessage, isLoading: false });
      console.error("Error fetching observations:", error);
    }
  },

  clearError: () => set({ error: null }),
}));

