import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Observation } from "../types/observation";
import { distanceKm, bearing } from "../utils/viewport";
import { getTaxaColor } from "../utils/colors";
import { useTheme } from "../utils/theme";
import { countActiveFilters } from "../types/filters";
import type { FilterParams } from "../types/filters";

interface FeedViewProps {
  observations: Observation[];
  filters: FilterParams;
  userLocation: { latitude: number; longitude: number } | null;
  onObservationPress: (observation: Observation) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * Apply filters to observations
 */
function applyFilters(observations: Observation[], filters: FilterParams): Observation[] {
  return observations.filter((obs) => {
    // Provider filter
    if (filters.provider.length > 0 && !filters.provider.includes(obs.provider)) {
      return false;
    }

    // Taxa filter
    if (filters.taxa.length > 0 && !filters.taxa.includes(obs.taxaBucket)) {
      return false;
    }

    // Photo filter
    if (filters.hasPhoto === true && !obs.photoUrl) {
      return false;
    }
    if (filters.hasPhoto === false && obs.photoUrl) {
      return false;
    }

    // Recency filter
    if (filters.recency && obs.observedAt) {
      const observedDate = new Date(obs.observedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - observedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (filters.recency === "today" && daysDiff > 0) {
        return false;
      }
      if (filters.recency === "this_week" && daysDiff > 7) {
        return false;
      }
      if (filters.recency === "this_month" && daysDiff > 30) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Convert bearing in degrees to compass direction
 */
function bearingToCompass(bearing: number): string {
  if (isNaN(bearing) || !isFinite(bearing)) {
    return "N";
  }
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  const normalizedBearing = ((bearing % 360) + 360) % 360; // Normalize to 0-360
  const index = Math.round(normalizedBearing / 22.5) % 16;
  return directions[index];
}

/**
 * Format bearing with compass direction
 */
function formatBearing(bearing: number): string {
  if (isNaN(bearing) || !isFinite(bearing)) {
    return "0° N";
  }
  const normalizedBearing = ((bearing % 360) + 360) % 360; // Normalize to 0-360
  const compass = bearingToCompass(normalizedBearing);
  return `${Math.round(normalizedBearing)}° ${compass}`;
}

interface FeedItemProps {
  observation: Observation;
  distance: number | null;
  bearing: number | null;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}

const FeedItem: React.FC<FeedItemProps> = ({ observation, distance, bearing: bearingDeg, onPress, theme }) => {
  const color = getTaxaColor(observation.taxaBucket);
  const providerName = observation.provider === "ebird" ? "eBird" : "iNaturalist";

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.feedItem, { backgroundColor: theme.background.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {observation.photoUrl ? (
        <Image
          source={{ uri: observation.photoUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: theme.background.secondary }]}>
          <Text style={[styles.placeholderText, { color: theme.text.muted }]} allowFontScaling={true}>No photo</Text>
        </View>
      )}
      <View style={styles.feedItemContent}>
        <View style={styles.feedItemHeader}>
          <View style={styles.titleRow}>
            <View style={styles.nameContainer}>
              <Text style={[styles.feedItemName, { color: theme.text.primary }]} numberOfLines={1} allowFontScaling={true}>
                {observation.commonName || observation.scientificName || "Unknown"}
              </Text>
              {observation.scientificName && observation.scientificName !== observation.commonName && (
                <Text style={[styles.feedItemScientific, { color: theme.text.secondary }]} numberOfLines={1} allowFontScaling={true}>
                  {observation.scientificName}
                </Text>
              )}
            </View>
            <View style={[styles.taxaChip, { borderColor: color }]}>
              <Text style={[styles.taxaChipText, { color }]} allowFontScaling={true}>
                {observation.taxaBucket}
              </Text>
            </View>
          </View>
        </View>
        {distance !== null && (
          <View style={styles.distanceContainer}>
            <Text style={[styles.feedItemDistance, { color: theme.text.secondary }]} allowFontScaling={true}>
              {formatDistance(distance)}
            </Text>
            {bearingDeg !== null && !isNaN(bearingDeg) && isFinite(bearingDeg) && (
              <>
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
                  color={theme.text.muted}
                  style={[
                    styles.compassIcon,
                    { transform: [{ rotate: `${bearingDeg}deg` }] },
                  ]}
                />
                <Text style={[styles.bearingText, { color: theme.text.muted }]} allowFontScaling={true}>
                  {formatBearing(bearingDeg)}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const FeedView: React.FC<FeedViewProps> = ({
  observations,
  filters,
  userLocation,
  onObservationPress,
  isLoading,
  isLoadingMore,
  onLoadMore,
}) => {
  const theme = useTheme();

  // Apply filters and sort by distance
  const filteredAndSorted = useMemo(() => {
    // Safety check: ensure observations is an array
    if (!Array.isArray(observations)) {
      console.warn("FeedView: observations is not an array", observations);
      return [];
    }

    try {
      const filtered = applyFilters(observations, filters);
      
      if (!userLocation) {
        // Return observations without distance when user location is not available
        return filtered.map((obs) => ({
          observation: obs,
          distance: null as number | null,
          bearing: null as number | null,
        }));
      }

      // Validate userLocation
      if (
        typeof userLocation.latitude !== "number" ||
        typeof userLocation.longitude !== "number" ||
        !isFinite(userLocation.latitude) ||
        !isFinite(userLocation.longitude) ||
        isNaN(userLocation.latitude) ||
        isNaN(userLocation.longitude)
      ) {
        console.warn("FeedView: Invalid userLocation", userLocation);
        return filtered.map((obs) => ({
          observation: obs,
          distance: null as number | null,
          bearing: null as number | null,
        }));
      }

      // Calculate distance and bearing for each observation and sort
      const withDistance = filtered.map((obs) => {
        try {
          // Validate observation coordinates
          if (
            typeof obs.lat !== "number" ||
            typeof obs.lng !== "number" ||
            !isFinite(obs.lat) ||
            !isFinite(obs.lng) ||
            isNaN(obs.lat) ||
            isNaN(obs.lng)
          ) {
            return {
              observation: obs,
              distance: null as number | null,
              bearing: null as number | null,
            };
          }

          const dist = distanceKm(
            userLocation.latitude,
            userLocation.longitude,
            obs.lat,
            obs.lng
          );
          const bear = bearing(
            userLocation.latitude,
            userLocation.longitude,
            obs.lat,
            obs.lng
          );
          return {
            observation: obs,
            distance: isNaN(dist) || !isFinite(dist) ? null : dist,
            bearing: isNaN(bear) || !isFinite(bear) ? null : bear,
          };
        } catch (error) {
          console.error("Error calculating distance/bearing:", error);
          return {
            observation: obs,
            distance: null as number | null,
            bearing: null as number | null,
          };
        }
      });

      return withDistance.sort((a, b) => {
        // If either distance is null, put it at the end
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } catch (error) {
      console.error("Error in filteredAndSorted useMemo:", error);
      return [];
    }
  }, [observations, filters, userLocation]);

  // Feed background should be slightly darker than card background
  const feedBackgroundColor = theme.background.primary === "#FFFFFF"
    ? "#F5F5F5" // Slightly darker than white
    : "#0A0A0A"; // Slightly lighter than black

  if (isLoading && filteredAndSorted.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <ActivityIndicator size="large" color={theme.text.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]} allowFontScaling={true}>
          Loading observations...
        </Text>
      </View>
    );
  }

  if (filteredAndSorted.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <Text style={[styles.emptyText, { color: theme.text.secondary }]} allowFontScaling={true}>
          {countActiveFilters(filters) > 0
            ? "No observations match your filters"
            : "No observations found"}
        </Text>
      </View>
    );
  }

  // Handle scroll to detect when near end
  const handleEndReached = () => {
    try {
      if (
        !isLoadingMore &&
        !isLoading &&
        userLocation &&
        onLoadMore &&
        typeof onLoadMore === "function"
      ) {
        // Validate userLocation before calling
        if (
          typeof userLocation.latitude === "number" &&
          typeof userLocation.longitude === "number" &&
          isFinite(userLocation.latitude) &&
          isFinite(userLocation.longitude)
        ) {
          onLoadMore();
        }
      }
    } catch (error) {
      console.error("Error in handleEndReached:", error);
    }
  };

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.text.primary} />
        <Text style={[styles.footerText, { color: theme.text.secondary }]} allowFontScaling={true}>
          Loading more...
        </Text>
      </View>
    );
  };

  // Safety check before rendering
  if (!Array.isArray(filteredAndSorted)) {
    console.warn("FeedView: filteredAndSorted is not an array");
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <Text style={[styles.emptyText, { color: theme.text.secondary }]} allowFontScaling={true}>
          Unable to load observations
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: feedBackgroundColor }]}>
      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => {
          // Safety check for item structure
          if (!item || !item.observation || !item.observation.id) {
            console.warn("FeedView: Invalid item in filteredAndSorted", item);
            return `invalid-${Math.random()}`;
          }
          return item.observation.id;
        }}
        renderItem={({ item }) => {
          // Safety check before rendering item
          if (!item || !item.observation) {
            console.warn("FeedView: Invalid item in renderItem", item);
            return null;
          }
          return (
            <FeedItem
              observation={item.observation}
              distance={item.distance}
              bearing={item.bearing}
              onPress={() => {
                try {
                  if (onObservationPress && typeof onObservationPress === "function") {
                    onObservationPress(item.observation);
                  }
                } catch (error) {
                  console.error("Error in onObservationPress:", error);
                }
              }}
              theme={theme}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5} // Trigger when 50% from bottom
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 124, 
    paddingBottom: 16,
  },
  feedItem: {
    flexDirection: "row",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 12,
  },
  feedItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  feedItemHeader: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  nameContainer: {
    flex: 1,
    minWidth: 0, // Allow text to shrink
    flexDirection: "column",
    gap: 8,
  },
  feedItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  feedItemScientific: {
    fontSize: 14,
    fontStyle: "italic",
  },
  taxaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: "flex-start",
  },
  taxaChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compassIcon: {
    // Icon styling handled inline
  },
  bearingText: {
    fontSize: 12,
    opacity: 0.7,
  },
  feedItemDistance: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
});

