import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Region, Marker } from "react-native-maps";
import ClusteredMapView from "react-native-map-clustering";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { fetchObservationById, fetchObservations } from "../api/client";
import { ObservationMarker } from "./ObservationMarker";
import { ClusterMarker } from "./ClusterMarker";
import { DEFAULT_REGION, regionToViewportParams } from "../utils/viewport";
import { ObservationSheet } from "./ObservationSheet";
import { ErrorState } from "./ErrorState";
import { ColorLegend } from "./ColorLegend";
import { FilterSheet } from "./FilterSheet";
import { Header } from "./Header";
import { countActiveFilters, DEFAULT_FILTERS, type FilterParams } from "../types/filters";
import { useTheme } from "../utils/theme";
import { useDeepLink } from "../context/DeepLinkContext";
import type { Observation } from "../types/observation";
import { loadFilters, saveFilters } from "../services/filters";
import { getSeenObservationIds, markObservationAsSeen as markObservationAsSeenService } from "../services/seenObservations";

// Custom map style to hide businesses but keep landmarks and parks
const CUSTOM_MAP_STYLE = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.attraction",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.place_of_worship",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.government",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.medical",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.school",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.sports_complex",
    stylers: [{ visibility: "off" }],
  },
];

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
  const { deepLinkedObservation, setDeepLinkedObservation } = useDeepLink();

  // State
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [viewport, setViewport] = useState<Region | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterParams>(DEFAULT_FILTERS);
  const [seenObservationIds, setSeenObservationIds] = useState<Set<string>>(new Set());
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [seenObservationsLoaded, setSeenObservationsLoaded] = useState(false);

  // Refs
  const mapRef = useRef<any>(null);
  const initialRegionRef = useRef<Region | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const isZoomingIntoClusterRef = useRef(false);
  const lastCenteredObservationIdRef = useRef<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const viewportAbortControllerRef = useRef<AbortController | null>(null);

  // Fetch observations for viewport
  const fetchObservationsForViewport = useCallback(async (
    region: Region,
    userLocation?: { latitude: number; longitude: number },
    filtersToUse?: FilterParams
  ) => {
    // Cancel previous request if exists
    if (viewportAbortControllerRef.current) {
      viewportAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    viewportAbortControllerRef.current = new AbortController();
    const signal = viewportAbortControllerRef.current.signal;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const viewportParams = regionToViewportParams(region);
      const filtersForFetch = filtersToUse || filters;
      
      const newObservations = await fetchObservations(
        viewportParams, 
        filtersForFetch,
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
      
      // When filters are explicitly provided (filter change), replace observations completely
      // When filters are not provided (viewport change), merge to preserve cluster counts when zooming
      let mergedObservations: Observation[];
      
      if (filtersToUse) {
        // Filters were explicitly provided (filter changed), replace completely
        mergedObservations = newObservations;
      } else if (userLocation) {
        // For feed view: replace with new observations to maintain distance-based sorting
        // The server has already sorted by distance, so we should preserve that order
        const observationMap = new Map<string, Observation>();
        
        // Add new observations first (they're already sorted by distance from server)
        newObservations.forEach(obs => {
          observationMap.set(obs.id, obs);
        });
        
        // Only add existing observations that aren't in the new set (for continuity)
        // But we need to re-sort to maintain distance order
        observations.forEach(obs => {
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
        observations.forEach(obs => {
          observationMap.set(obs.id, obs);
        });
        // Add/update with new observations
        newObservations.forEach(obs => {
          observationMap.set(obs.id, obs);
        });
        // Convert back to array (order doesn't matter for map view)
        mergedObservations = Array.from(observationMap.values());
      }
      
      setObservations(mergedObservations);
      setViewport(region);
      setIsLoading(false);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch observations";
      setError(errorMessage);
      setIsLoading(false);
      console.error("Error fetching observations:", error);
    }
  }, [filters, observations]);

  // Set filters (with Supabase save)
  const setFilters = useCallback(async (newFilters: FilterParams) => {
    const currentFilters = filters;
    
    // Save to Supabase
    await saveFilters(newFilters);
    
    setFiltersState(newFilters);
    
    // If filters changed, clear observations and refetch for current viewport
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(newFilters);
    if (filtersChanged && viewport) {
      setObservations([]); // Clear to trigger refetch
      // Pass newFilters explicitly to use the updated filters immediately
      fetchObservationsForViewport(viewport, undefined, newFilters);
    }
  }, [filters, viewport, fetchObservationsForViewport]);

  // Mark observation as seen
  const markObservationAsSeenCallback = useCallback(async (observationId: string) => {
    await markObservationAsSeenService(observationId);
    
    // Update local state
    setSeenObservationIds(prev => {
      const newSet = new Set(prev);
      newSet.add(observationId);
      return newSet;
    });
  }, []);

  // Filter observations to those within a reasonable distance of current viewport
  // This keeps cluster counts accurate while preventing memory issues
  // When zoomed into a cluster, use more generous filtering to show all cluster markers
  const filteredObservations = React.useMemo(() => {
    if (!viewport) return observations;
    
    let filtered = observations;
    
    // Filter by seen status if showNewOnly is enabled
    if (filters.showNewOnly) {
      filtered = filtered.filter(obs => !seenObservationIds.has(obs.id));
    }
    
    // When zoomed in (clustering disabled), use more generous padding to show all markers
    // When zoomed out (clustering enabled), use tighter filtering for performance
    const isZoomedIn = viewport.latitudeDelta < 0.03;
    const paddingMultiplier = isZoomedIn ? 5 : 2; // More generous when zoomed in
    
    const latPadding = viewport.latitudeDelta * paddingMultiplier;
    const lngPadding = viewport.longitudeDelta * paddingMultiplier;
    
    return filtered.filter(obs => {
      const latDiff = Math.abs(obs.lat - viewport.latitude);
      const lngDiff = Math.abs(obs.lng - viewport.longitude);
      return latDiff <= latPadding && lngDiff <= lngPadding;
    });
  }, [observations, viewport, filters.showNewOnly, seenObservationIds]);

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
      // Store the initial region on first load
      if (!initialRegionRef.current) {
        initialRegionRef.current = region;
      }
      
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
    [debouncedFetch]
  );

  // Load filters and seen observations on mount (only once)
  useEffect(() => {
    // Load filters from Supabase
    if (!filtersLoaded) {
      loadFilters().then((loadedFilters) => {
        setFiltersState(loadedFilters);
        setFiltersLoaded(true);
      });
    }
    
    // Load seen observations from Supabase
    if (!seenObservationsLoaded) {
      getSeenObservationIds().then((seenIds) => {
        setSeenObservationIds(seenIds);
        setSeenObservationsLoaded(true);
      });
    }
  }, [filtersLoaded, seenObservationsLoaded]);


  // Handle deep-linked observation
  useEffect(() => {
    if (deepLinkedObservation) {
      setSelectedObservation(deepLinkedObservation);
      setDeepLinkedObservation(null); // Clear after using
    }
  }, [deepLinkedObservation, setDeepLinkedObservation]);

  // Mark observation as seen when selected
  useEffect(() => {
    if (selectedObservation) {
      markObservationAsSeenCallback(selectedObservation.id);
    }
  }, [selectedObservation, markObservationAsSeenCallback]);

  // Get user location and fetch initial observations (wait for filters to load first)
  useEffect(() => {
    // Wait for filters to load before fetching initial observations
    if (!filtersLoaded) {
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // Permission denied - fetch without location
          if (!viewport) {
            // Use loaded filters for initial fetch
            fetchObservationsForViewport(DEFAULT_REGION, undefined, filters);
          }
          return;
        }

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);

        // Fetch initial observations WITH userLocation for distance/bearing calculation
        if (!viewport) {
          // Use user's location as the initial viewport center
          const initialViewport: Region = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: DEFAULT_REGION.latitudeDelta,
            longitudeDelta: DEFAULT_REGION.longitudeDelta,
          };
          // Use loaded filters for initial fetch
          fetchObservationsForViewport(initialViewport, coords, filters);
        }
      } catch (error) {
        console.error("Error getting user location:", error);
        // If location fails, still fetch observations without location
        if (!viewport) {
          // Use loaded filters for initial fetch
          fetchObservationsForViewport(DEFAULT_REGION, undefined, filters);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersLoaded, filters, viewport, fetchObservationsForViewport]);

  const handleDeepLink = useCallback(async (url: string) => {
    try {
      // Parse URL: animals-near-me://observation/{id}
      const parsed = Linking.parse(url);
      
      // Handle path like "observation/{id}" or "observation" with id in query params
      let observationId: string | null = null;
      
      if (parsed.path) {
        const pathParts = parsed.path.split("/");
        if (pathParts[0] === "observation" && pathParts[1]) {
          observationId = pathParts[1];
        } else if (parsed.queryParams?.id) {
          observationId = parsed.queryParams.id as string;
        }
      }
      
      if (observationId) {
        const observation = await fetchObservationById(observationId);
        if (observation) {
          setDeepLinkedObservation(observation);
          // Center map on observation location
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: observation.lat,
                longitude: observation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              500
            );
          }
        }
      }
    } catch (error) {
      console.error("Error handling deep link:", error);
    }
  }, [setDeepLinkedObservation]);

  // Handle deep links
  useEffect(() => {
    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // Center map on selected observation only once when it's first selected
  useEffect(() => {
    if (selectedObservation && mapRef.current && viewport) {
      // Only center if this is a new observation (not the one we already centered on)
      if (lastCenteredObservationIdRef.current !== selectedObservation.id) {
        // Set flag to prevent refetching when centering on observation
        isZoomingIntoClusterRef.current = true;

        // Adjust center point to position marker higher on screen (accounting for bottom sheet)
        // Move center slightly south (lower latitude) so marker appears in upper portion of visible area
        const verticalOffset = viewport.latitudeDelta * 0.15; // 15% of viewport height upward
        const adjustedLatitude = selectedObservation.lat - verticalOffset;

        // Animate to the adjusted coordinate, keeping current zoom level
        // This ensures the marker is visible and positioned higher to avoid bottom sheet
        mapRef.current.animateToRegion(
          {
            latitude: adjustedLatitude,
            longitude: selectedObservation.lng,
            latitudeDelta: viewport.latitudeDelta,
            longitudeDelta: viewport.longitudeDelta,
          },
          300
        );

        // Track that we've centered on this observation
        lastCenteredObservationIdRef.current = selectedObservation.id;

        // Reset the flag after animation completes
        setTimeout(() => {
          isZoomingIntoClusterRef.current = false;
        }, 500);
      }
    } else if (!selectedObservation) {
      // Clear the last centered ID when no observation is selected
      lastCenteredObservationIdRef.current = null;
    }
  }, [selectedObservation, viewport]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (viewport) {
      fetchObservationsForViewport(viewport);
    }
  }, [viewport, fetchObservationsForViewport]);

  // Center map on user location
  const handleCenterOnLocation = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(coords);

      // Set flag to prevent refetching when centering on location
      isZoomingIntoClusterRef.current = true;

      // Animate to user location with a reasonable zoom level
      mapRef.current.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.01, // Approximately 1km view
          longitudeDelta: 0.01,
        },
        500
      );

      // Reset the flag after animation completes
      setTimeout(() => {
        isZoomingIntoClusterRef.current = false;
      }, 1000);
    } catch (error) {
      console.error("Error centering on location:", error);
    }
  }, []);

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
      {/* Header Component */}
      <Header
        filters={filters}
        onFilterPress={() => setShowFilterSheet(!showFilterSheet)}
        isLoading={isLoading}
      />

      {/* Map View */}
      <View style={styles.mapContainer}>
        <ClusteredMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegionRef.current || viewport || DEFAULT_REGION}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={true}
          showsMyLocationButton={true}
          onLongPress={() => setShowLegend(!showLegend)}
          clusteringEnabled={viewport ? viewport.latitudeDelta >= 0.03 : true}
          clusterColor="#2563EB"
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
          mapType="terrain"
          customMapStyle={CUSTOM_MAP_STYLE}
        >
            {displayedObservations.map((item) => {
              const isSeen = seenObservationIds.has(item.observation.id);
              return (
                <ObservationMarker
                  key={item.observation.id}
                  observation={item.observation}
                  onPress={setSelectedObservation}
                  coordinate={{
                    latitude: item.observation.lat,
                    longitude: item.observation.lng,
                  }}
                  offset={item.offset}
                  selected={selectedObservation?.id === item.observation.id}
                  seen={isSeen}
                />
              );
            })}
          </ClusteredMapView>

        <>
          {error && <ErrorState error={error} onRetry={handleRetry} />}
          <ColorLegend visible={showLegend} />

          {/* Filter Button - Map View */}
            <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.background.card,
                shadowColor: theme.shadow.color,
                shadowOpacity: theme.shadow.opacity,
                zIndex: 20, // Higher than header (zIndex: 10)
              },
            ]}
            onPress={() => setShowFilterSheet(!showFilterSheet)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.filterButtonText, { color: theme.text.primary }]}
              allowFontScaling={true}
            >
              Filter
            </Text>
            {countActiveFilters(filters) > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText} allowFontScaling={true}>
                  {countActiveFilters(filters)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

            {/* Location Button - Map View Only */}
            <TouchableOpacity
              style={[
                styles.locationButton,
                {
                  backgroundColor: theme.background.card,
                  shadowColor: theme.shadow.color,
                  shadowOpacity: theme.shadow.opacity,
                  zIndex: 20, // Higher than header (zIndex: 10)
                },
              ]}
              onPress={handleCenterOnLocation}
              activeOpacity={0.8}
            >
              <Ionicons
                name="locate"
                size={20}
                color={theme.text.primary}
              />
            </TouchableOpacity>
        </>
      </View>

      {/* ObservationSheet */}
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
  mapContainer: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
  },
  filterButton: {
    position: "absolute",
    top: 70,
    right: 68,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  locationButton: {
    position: "absolute",
    top: 70,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
});

