import React, { useMemo, useCallback, useState } from "react";
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
import { getTaxaColor } from "../utils/colors";
import { useTheme } from "../utils/theme";

interface FeedViewProps {
  observations: Observation[];
  onObservationPress: (observation: Observation) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
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

const FeedItem: React.FC<FeedItemProps> = React.memo<FeedItemProps>(({ observation, distance, bearing: bearingDeg, onPress, theme }) => {
  const color = getTaxaColor(observation.taxaBucket);
  const [imageError, setImageError] = useState(false);

  // Debug logging
  console.log("[FeedItem] Rendering:", {
    id: observation.id,
    distance,
    bearing: bearingDeg,
    distanceType: typeof distance,
    bearingType: typeof bearingDeg,
    willShowDistance: distance !== null,
    willShowBearing: bearingDeg !== null && !isNaN(bearingDeg) && isFinite(bearingDeg),
  });

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[styles.feedItem, { backgroundColor: theme.background.card }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {observation.photoUrl && !imageError ? (
        <Image
          source={{ uri: observation.photoUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => {
            console.warn("Failed to load image:", observation.photoUrl);
            setImageError(true);
          }}
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
        {distance !== null && distance !== undefined ? (
          <View style={styles.distanceContainer}>
            <Text style={[styles.feedItemDistance, { color: theme.text.secondary }]} allowFontScaling={true}>
              {formatDistance(distance)}
            </Text>
            {bearingDeg !== null && bearingDeg !== undefined && !isNaN(bearingDeg) && isFinite(bearingDeg) && (
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
        ) : null}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.observation.id === nextProps.observation.id &&
    prevProps.distance === nextProps.distance &&
    prevProps.bearing === nextProps.bearing &&
    prevProps.theme === nextProps.theme
  );
});

export const FeedView: React.FC<FeedViewProps> = ({
  observations,
  onObservationPress,
  isLoading,
  isLoadingMore,
  onLoadMore,
}) => {
  const theme = useTheme();

  // Memoize the press handler to prevent unnecessary re-renders
  const handleObservationPress = useCallback((observation: Observation) => {
    try {
      if (onObservationPress && typeof onObservationPress === "function") {
        onObservationPress(observation);
      }
    } catch (error) {
      console.error("Error in onObservationPress:", error);
    }
  }, [onObservationPress]);

  // Simple validation - server already filtered and sorted
  const validObservations = useMemo(() => {
    if (!Array.isArray(observations)) {
      console.warn("FeedView: observations is not an array", observations);
      return [];
    }
    // Server already validated and filtered - trust it
    // Debug logging
    if (observations.length > 0) {
      console.log("[FeedView] validObservations sample:", {
        count: observations.length,
        firstObservation: {
          id: observations[0]?.id,
          hasDistance: observations[0]?.distance !== undefined,
          distance: observations[0]?.distance,
          hasBearing: observations[0]?.bearing !== undefined,
          bearing: observations[0]?.bearing,
        },
      });
    }
    return observations;
  }, [observations]);

  // Feed background should be slightly darker than card background
  const feedBackgroundColor = theme.background.primary === "#FFFFFF"
    ? "#F5F5F5" // Slightly darker than white
    : "#0A0A0A"; // Slightly lighter than black

  // Handle scroll to detect when near end
  const handleEndReached = useCallback(() => {
    try {
      if (!isLoadingMore && !isLoading && onLoadMore && typeof onLoadMore === "function") {
        onLoadMore();
      }
    } catch (error) {
      console.error("Error in handleEndReached:", error);
    }
  }, [isLoadingMore, isLoading, onLoadMore]);

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.text.primary} />
        <Text style={[styles.footerText, { color: theme.text.secondary }]} allowFontScaling={true}>
          Loading more...
        </Text>
      </View>
    );
  }, [isLoadingMore, theme]);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: Observation }) => {
    const distance = item.distance ?? null;
    const bearing = item.bearing ?? null;
    
    // Debug logging
    if (validObservations.length > 0) {
      console.log("[FeedView] Rendering item:", {
        id: item.id,
        hasDistance: item.distance !== undefined,
        distance: item.distance,
        distanceProp: distance,
        hasBearing: item.bearing !== undefined,
        bearing: item.bearing,
        bearingProp: bearing,
      });
    }
    
    return (
      <FeedItem
        observation={item}
        distance={distance}
        bearing={bearing}
        onPress={() => handleObservationPress(item)}
        theme={theme}
      />
    );
  }, [handleObservationPress, theme, validObservations.length]);

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: Observation, index: number) => {
    return item?.id || `obs-${index}`;
  }, []);

  // Early returns AFTER all hooks are called
  if (isLoading && validObservations.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <ActivityIndicator size="large" color={theme.text.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]} allowFontScaling={true}>
          Loading observations...
        </Text>
      </View>
    );
  }

  if (validObservations.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <Text style={[styles.emptyText, { color: theme.text.secondary }]} allowFontScaling={true}>
          No observations found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: feedBackgroundColor }]} pointerEvents="auto">
      <FlatList
        data={validObservations}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        updateCellsBatchingPeriod={50}
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

