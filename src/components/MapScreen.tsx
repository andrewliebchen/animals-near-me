import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Region } from "react-native-maps";
import { useObservationStore } from "../store/observationStore";
import { ObservationMarker } from "./ObservationMarker";
import { DEFAULT_REGION } from "../utils/viewport";
import { ObservationSheet } from "./ObservationSheet";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { ColorLegend } from "./ColorLegend";

// Debounce utility
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

export const MapScreen: React.FC = () => {
  const {
    observations,
    selectedObservation,
    viewport,
    isLoading,
    error,
    fetchObservationsForViewport,
    setSelectedObservation,
    setViewport,
    clearError,
  } = useObservationStore();

  const mapRef = useRef<MapView>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Limit markers at low zoom for performance
  const MAX_MARKERS = 500;
  const displayedObservations = observations.slice(0, MAX_MARKERS);

  // Debounced fetch function (500-800ms delay)
  const debouncedFetch = useDebounce(fetchObservationsForViewport, 600);

  // Handle region change
  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      setViewport(region);
      debouncedFetch(region);
    },
    [debouncedFetch, setViewport]
  );

  // Initial fetch on mount
  useEffect(() => {
    if (!viewport) {
      fetchObservationsForViewport(DEFAULT_REGION);
    }
  }, []);

  const handleRetry = useCallback(() => {
    clearError();
    if (viewport) {
      fetchObservationsForViewport(viewport);
    }
  }, [viewport, fetchObservationsForViewport, clearError]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onLongPress={() => setShowLegend(!showLegend)}
      >
        {displayedObservations.map((observation) => (
          <ObservationMarker
            key={observation.id}
            observation={observation}
            onPress={setSelectedObservation}
          />
        ))}
      </MapView>

      {isLoading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={handleRetry} />}
      <ColorLegend visible={showLegend} />

      <ObservationSheet
        observation={selectedObservation}
        onClose={() => setSelectedObservation(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

