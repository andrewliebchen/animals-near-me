import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Region, Marker } from "react-native-maps";
import ClusteredMapView from "react-native-map-clustering";
import { useObservationStore } from "../store/observationStore";
import { ObservationMarker } from "./ObservationMarker";
import { ClusterMarker } from "./ClusterMarker";
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

  const mapRef = useRef<any>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const isZoomingIntoClusterRef = useRef(false);

  // Filter observations to those within a reasonable distance of current viewport
  // This keeps cluster counts accurate while preventing memory issues
  // When zooming into a cluster, use more generous filtering to show all cluster markers
  const filteredObservations = React.useMemo(() => {
    if (!viewport) return observations;
    
    // When zoomed in (clustering disabled), use more generous padding to show all markers
    // When zoomed out (clustering enabled), use tighter filtering for performance
    const isZoomedIn = viewport.latitudeDelta < 0.03;
    const paddingMultiplier = isZoomedIn ? 5 : 2; // More generous when zoomed in
    
    const latPadding = viewport.latitudeDelta * paddingMultiplier;
    const lngPadding = viewport.longitudeDelta * paddingMultiplier;
    
    return observations.filter(obs => {
      const latDiff = Math.abs(obs.lat - viewport.latitude);
      const lngDiff = Math.abs(obs.lng - viewport.longitude);
      return latDiff <= latPadding && lngDiff <= lngPadding;
    });
  }, [observations, viewport]);

  // Limit markers at low zoom for performance
  const MAX_MARKERS = 500;
  const baseObservations = filteredObservations.slice(0, MAX_MARKERS);

  // Spread out overlapping markers when clustering is disabled (zoomed in)
  // This prevents markers from stacking on top of each other
  const displayedObservations = React.useMemo(() => {
    const isZoomedIn = viewport && viewport.latitudeDelta < 0.03;
    
    // Always return consistent structure: { observation, offset }
    if (!isZoomedIn || baseObservations.length === 0) {
      return baseObservations.map(obs => ({
        observation: obs,
        offset: { lat: 0, lng: 0 },
      }));
    }

    // Threshold for considering markers "overlapping" (roughly 10 meters)
    const OVERLAP_THRESHOLD = 0.0001; // degrees
    const SPREAD_DISTANCE = 0.00015; // degrees (roughly 15 meters)
    
    const processed: Array<{ observation: typeof baseObservations[0]; offset: { lat: number; lng: number } }> = [];
    const groups: Array<Array<typeof baseObservations[0]>> = [];

    // Group overlapping observations
    for (const obs of baseObservations) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const firstInGroup = group[0];
        const latDiff = Math.abs(obs.lat - firstInGroup.lat);
        const lngDiff = Math.abs(obs.lng - firstInGroup.lng);
        
        if (latDiff < OVERLAP_THRESHOLD && lngDiff < OVERLAP_THRESHOLD) {
          group.push(obs);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([obs]);
      }
    }

    // Apply offsets to overlapping groups
    for (const group of groups) {
      if (group.length === 1) {
        // No overlap, no offset needed
        processed.push({ observation: group[0], offset: { lat: 0, lng: 0 } });
      } else {
        // Spread markers in a circle around the center
        const centerLat = group.reduce((sum, o) => sum + o.lat, 0) / group.length;
        const centerLng = group.reduce((sum, o) => sum + o.lng, 0) / group.length;
        
        group.forEach((obs, index) => {
          // Distribute markers evenly in a circle
          const angle = (index * 2 * Math.PI) / group.length;
          const latOffset = Math.cos(angle) * SPREAD_DISTANCE;
          const lngOffset = Math.sin(angle) * SPREAD_DISTANCE;
          
          processed.push({
            observation: obs,
            offset: {
              lat: centerLat + latOffset - obs.lat,
              lng: centerLng + lngOffset - obs.lng,
            },
          });
        });
      }
    }

    return processed;
  }, [baseObservations, viewport]);


  // Debounced fetch function (500-800ms delay)
  const debouncedFetch = useDebounce(fetchObservationsForViewport, 600);

  // Handle region change
  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: any, markers?: any[]) => {
      setViewport(region);
      
      // Don't refetch if we're programmatically zooming into a cluster
      // This prevents markers from disappearing when zooming in
      if (isZoomingIntoClusterRef.current) {
        // Reset the flag after a short delay to allow normal fetching to resume
        setTimeout(() => {
          isZoomingIntoClusterRef.current = false;
        }, 1000);
        return;
      }
      
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

  // Handle cluster press - zoom into cluster to show all contained markers
  const handleClusterPress = useCallback(
    (cluster: any, markers?: any[]) => {
      if (!mapRef.current || !cluster || !viewport) {
        return;
      }

      // Extract cluster coordinate from GeoJSON format
      let clusterLat: number;
      let clusterLng: number;
      
      if (cluster.coordinate) {
        clusterLat = cluster.coordinate.latitude;
        clusterLng = cluster.coordinate.longitude;
      } else if (cluster.geometry && cluster.geometry.coordinates) {
        clusterLat = cluster.geometry.coordinates[1];
        clusterLng = cluster.geometry.coordinates[0];
      } else {
        return;
      }

      // If we have child markers, use fitToCoordinates to show them all
      if (markers && markers.length > 0) {
        const coordinates = markers
          .map((m: any) => {
            if (m.coordinate) {
              return m.coordinate;
            } else if (m.geometry && m.geometry.coordinates) {
              return {
                latitude: m.geometry.coordinates[1],
                longitude: m.geometry.coordinates[0],
              };
            }
            return null;
          })
          .filter((c: any) => c !== null);

        if (coordinates.length > 0) {
          // Set flag to prevent refetching when zooming into cluster
          isZoomingIntoClusterRef.current = true;

          // Use fitToCoordinates to show all markers with padding
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: {
              top: 100,
              right: 100,
              bottom: 100,
              left: 100,
            },
            animated: true,
          });
          return;
        }
      }

      // Fallback: zoom in significantly on cluster center
      // Always zoom in by at least 3x (reduce delta by 3x)
      const newLatDelta = Math.max(0.005, viewport.latitudeDelta / 3);
      const newLngDelta = Math.max(0.005, viewport.longitudeDelta / 3);

      // Set flag to prevent refetching when zooming into cluster
      isZoomingIntoClusterRef.current = true;

      mapRef.current.animateToRegion(
        {
          latitude: clusterLat,
          longitude: clusterLng,
          latitudeDelta: newLatDelta,
          longitudeDelta: newLngDelta,
        },
        300
      );
    },
    [viewport]
  );

  // Render function for clusters
  const renderCluster = useCallback((cluster: any) => {
    // Don't render clusters when zoomed in - show individual markers instead
    // This prevents clusters from obscuring individual markers that users want to tap
    // Increased threshold so clusters disappear at a higher zoom level
    if (viewport && viewport.latitudeDelta < 0.03) {
      return null;
    }

    // The library passes a marker object (GeoJSON feature) with geometry.coordinates [lng, lat] and properties.point_count
    // Format: { geometry: { coordinates: [lng, lat] }, properties: { point_count: number }, id, onPress, ... }
    if (!cluster || !cluster.geometry || !Array.isArray(cluster.geometry.coordinates)) {
      return null;
    }

    const [lng, lat] = cluster.geometry.coordinates;
    const coordinate = {
      latitude: lat,
      longitude: lng,
    };

    // Get point count from cluster properties
    const pointCount = cluster.properties?.point_count || 0;

    if (!pointCount || pointCount === 0) {
      return null;
    }
    return (
      <ClusterMarker
        key={`cluster-${cluster.id}`}
        coordinate={coordinate}
        count={pointCount}
        onPress={cluster.onPress || (() => {})}
      />
    );
  }, [viewport]);

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onLongPress={() => setShowLegend(!showLegend)}
        clusteringEnabled={viewport ? viewport.latitudeDelta >= 0.03 : true}
        clusterColor="#3B82F6"
        clusterTextColor="#FFFFFF"
        radius={60}
        extent={512}
        minZoom={0}
        maxZoom={20}
        minPoints={2}
        onClusterPress={handleClusterPress}
        renderCluster={renderCluster}
        preserveClusterPressBehavior={true}
        spiralEnabled={false}
      >
        {displayedObservations.map((item) => (
          <ObservationMarker
            key={item.observation.id}
            observation={item.observation}
            onPress={setSelectedObservation}
            coordinate={{
              latitude: item.observation.lat,
              longitude: item.observation.lng,
            }}
            offset={item.offset}
          />
        ))}
      </ClusteredMapView>

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

