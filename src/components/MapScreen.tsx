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

  // Limit markers at low zoom for performance
  const MAX_MARKERS = 500;
  const displayedObservations = observations.slice(0, MAX_MARKERS);

  // Log observation count
  useEffect(() => {
    console.log("[MapScreen] Observations:", {
      total: observations.length,
      displayed: displayedObservations.length,
      viewport: viewport ? {
        latDelta: viewport.latitudeDelta,
        lngDelta: viewport.longitudeDelta,
      } : null,
    });
  }, [observations.length, displayedObservations.length, viewport]);

  // Debounced fetch function (500-800ms delay)
  const debouncedFetch = useDebounce(fetchObservationsForViewport, 600);

  // Handle region change
  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: any, markers?: any[]) => {
      console.log("[handleRegionChangeComplete] Region changed:", {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
        hasDetails: !!details,
        hasMarkers: !!markers,
        markerCount: markers?.length || 0,
        clusterCount: markers?.filter((m: any) => m?.properties?.point_count > 0).length || 0,
        individualMarkerCount: markers?.filter((m: any) => !m?.properties?.point_count || m?.properties?.point_count === 0).length || 0,
        sampleMarkers: markers?.slice(0, 3).map((m: any) => ({
          id: m?.id,
          pointCount: m?.properties?.point_count,
          hasGeometry: !!m?.geometry,
          coordinates: m?.geometry?.coordinates,
        })),
        allMarkerIds: markers?.map((m: any) => m?.id).slice(0, 10),
      });
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

  // Handle cluster press - zoom into cluster
  const handleClusterPress = useCallback(
    (cluster: any, markers?: any[]) => {
      console.log("[handleClusterPress] Called with:", {
        hasCluster: !!cluster,
        hasMarkers: !!markers,
        markerCount: markers?.length || 0,
        clusterData: cluster,
      });

      if (!mapRef.current || !cluster) {
        console.log("[handleClusterPress] Returning early - no mapRef or cluster");
        return;
      }

      // Extract cluster coordinate from GeoJSON format
      let clusterLat: number;
      let clusterLng: number;
      
      if (cluster.coordinate) {
        // If it's already a coordinate object
        clusterLat = cluster.coordinate.latitude;
        clusterLng = cluster.coordinate.longitude;
      } else if (cluster.geometry && cluster.geometry.coordinates) {
        // GeoJSON format: [lng, lat]
        clusterLat = cluster.geometry.coordinates[1];
        clusterLng = cluster.geometry.coordinates[0];
      } else {
        return;
      }

      // If we have child markers, calculate bounds; otherwise just zoom in
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
          const latitudes = coordinates.map((c: any) => c.latitude);
          const longitudes = coordinates.map((c: any) => c.longitude);

          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          const minLng = Math.min(...longitudes);
          const maxLng = Math.max(...longitudes);

          const latDelta = (maxLat - minLat) * 1.5; // Add padding
          const lngDelta = (maxLng - minLng) * 1.5;

          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;

          mapRef.current.animateToRegion(
            {
              latitude: centerLat,
              longitude: centerLng,
              latitudeDelta: Math.max(latDelta, 0.01),
              longitudeDelta: Math.max(lngDelta, 0.01),
            },
            300
          );
          return;
        }
      }

      // Fallback: zoom in on cluster center
      if (viewport) {
        mapRef.current.animateToRegion(
          {
            latitude: clusterLat,
            longitude: clusterLng,
            latitudeDelta: viewport.latitudeDelta * 0.5,
            longitudeDelta: viewport.longitudeDelta * 0.5,
          },
          300
        );
      }
    },
    [viewport]
  );

  // Render function for clusters
  const renderCluster = useCallback((cluster: any) => {
    console.log("[renderCluster] Called with cluster:", {
      hasCluster: !!cluster,
      hasGeometry: !!cluster?.geometry,
      hasCoordinates: !!cluster?.geometry?.coordinates,
      coordinates: cluster?.geometry?.coordinates,
      pointCount: cluster?.properties?.point_count,
      id: cluster?.id,
      fullCluster: cluster,
    });

    // The library passes a marker object (GeoJSON feature) with geometry.coordinates [lng, lat] and properties.point_count
    // Format: { geometry: { coordinates: [lng, lat] }, properties: { point_count: number }, id, onPress, ... }
    if (!cluster || !cluster.geometry || !Array.isArray(cluster.geometry.coordinates)) {
      console.log("[renderCluster] Returning null - missing required data");
      return null;
    }

    const [lng, lat] = cluster.geometry.coordinates;
    const coordinate = {
      latitude: lat,
      longitude: lng,
    };

    // Get point count from cluster properties
    const pointCount = cluster.properties?.point_count || 0;

    console.log("[renderCluster] Extracted data:", {
      coordinate,
      pointCount,
      clusterId: cluster.id,
    });

    if (!pointCount || pointCount === 0) {
      console.log("[renderCluster] Returning null - pointCount is 0");
      return null;
    }

    console.log("[renderCluster] Rendering ClusterMarker with count:", pointCount);
    return (
      <ClusterMarker
        key={`cluster-${cluster.id}`}
        coordinate={coordinate}
        count={pointCount}
        onPress={cluster.onPress || (() => {})}
      />
    );
  }, []);

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
        clusteringEnabled={true}
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
        onMarkersChange={(markers) => {
          console.log("[onMarkersChange] Markers changed:", {
            markerCount: markers?.length || 0,
            clusters: markers?.filter((m: any) => m.properties?.point_count > 0).length || 0,
            individualMarkers: markers?.filter((m: any) => !m.properties?.point_count || m.properties.point_count === 0).length || 0,
            sampleMarkers: markers?.slice(0, 3).map((m: any) => ({
              id: m.id,
              pointCount: m.properties?.point_count,
              hasGeometry: !!m.geometry,
              coordinates: m.geometry?.coordinates,
            })),
          });
        }}
      >
        {displayedObservations.map((observation) => (
          <ObservationMarker
            key={observation.id}
            observation={observation}
            onPress={setSelectedObservation}
            coordinate={{
              latitude: observation.lat,
              longitude: observation.lng,
            }}
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

