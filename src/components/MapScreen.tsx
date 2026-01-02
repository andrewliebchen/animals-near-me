import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import MapView, { Region } from "react-native-maps";
import { useObservationStore } from "../store/observationStore";
import { ObservationMarker } from "./ObservationMarker";
import { DEFAULT_REGION } from "../utils/viewport";
import { ObservationSheet } from "./ObservationSheet";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { ColorLegend } from "./ColorLegend";
import { FilterSheet } from "./FilterSheet";
import { countActiveFilters } from "../types/filters";
import { useTheme } from "../utils/theme";

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
  const theme = useTheme();
  const {
    observations,
    selectedObservation,
    viewport,
    isLoading,
    error,
    filters,
    fetchObservationsForViewport,
    setSelectedObservation,
    setViewport,
    setFilters,
    clearError,
  } = useObservationStore();

  const mapRef = useRef<MapView>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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

      {/* Filter Button */}
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: theme.background.card,
            shadowColor: theme.shadow.color,
            shadowOpacity: theme.shadow.opacity,
          },
        ]}
        onPress={() => setShowFilterSheet(true)}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.filterButtonText, { color: theme.text.primary }]}
        >
          Filter
        </Text>
        {countActiveFilters(filters) > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {countActiveFilters(filters)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <ObservationSheet
        observation={selectedObservation}
        onClose={() => setSelectedObservation(null)}
      />

      <FilterSheet
        visible={showFilterSheet}
        filters={filters}
        onFiltersChange={setFilters}
        onClose={() => setShowFilterSheet(false)}
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
  filterButton: {
    position: "absolute",
    top: 50,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  filterBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});

