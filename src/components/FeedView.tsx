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
import type { Observation } from "../types/observation";
import { distanceKm } from "../utils/viewport";
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

interface FeedItemProps {
  observation: Observation;
  distance: number | null;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}

const FeedItem: React.FC<FeedItemProps> = ({ observation, distance, onPress, theme }) => {
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
          <Text style={[styles.placeholderText, { color: theme.text.muted }]}>No photo</Text>
        </View>
      )}
      <View style={styles.feedItemContent}>
        <View style={styles.feedItemHeader}>
          <Text style={[styles.feedItemName, { color: theme.text.primary }]} numberOfLines={1}>
            {observation.commonName || observation.scientificName || "Unknown"}
          </Text>
          {distance !== null && (
            <Text style={[styles.feedItemDistance, { color: theme.text.secondary }]}>
              {formatDistance(distance)}
            </Text>
          )}
        </View>
        {observation.scientificName && observation.scientificName !== observation.commonName && (
          <Text style={[styles.feedItemScientific, { color: theme.text.secondary }]} numberOfLines={1}>
            {observation.scientificName}
          </Text>
        )}
        <View style={styles.feedItemMeta}>
          <View style={[styles.taxaChip, { borderColor: color }]}>
            <Text style={[styles.taxaChipText, { color }]}>
              {observation.taxaBucket}
            </Text>
          </View>
          <Text style={[styles.feedItemMetaText, { color: theme.text.muted }]}>
            {providerName} • {formatDate(observation.observedAt)}
          </Text>
        </View>
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
    const filtered = applyFilters(observations, filters);
    
    if (!userLocation) {
      // Return observations without distance when user location is not available
      return filtered.map((obs) => ({
        observation: obs,
        distance: null as number | null,
      }));
    }

    // Calculate distance for each observation and sort
    const withDistance = filtered.map((obs) => ({
      observation: obs,
      distance: distanceKm(
        userLocation.latitude,
        userLocation.longitude,
        obs.lat,
        obs.lng
      ),
    }));

    return withDistance.sort((a, b) => {
      // If either distance is null, put it at the end
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [observations, filters, userLocation]);

  // Feed background should be slightly darker than card background
  const feedBackgroundColor = theme.background.primary === "#FFFFFF"
    ? "#F5F5F5" // Slightly darker than white
    : "#0A0A0A"; // Slightly lighter than black

  if (isLoading && filteredAndSorted.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <ActivityIndicator size="large" color={theme.text.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          Loading observations...
        </Text>
      </View>
    );
  }

  if (filteredAndSorted.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: feedBackgroundColor }]}>
        <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
          {countActiveFilters(filters) > 0
            ? "No observations match your filters"
            : "No observations found"}
        </Text>
      </View>
    );
  }

  // Handle scroll to detect when near end
  const handleEndReached = () => {
    if (!isLoadingMore && !isLoading && userLocation) {
      onLoadMore();
    }
  };

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.text.primary} />
        <Text style={[styles.footerText, { color: theme.text.secondary }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: feedBackgroundColor }]}>
      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => item.observation.id}
        renderItem={({ item }) => (
          <FeedItem
            observation={item.observation}
            distance={item.distance}
            onPress={() => onObservationPress(item.observation)}
            theme={theme}
          />
        )}
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
    borderRadius: 12,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  feedItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  feedItemDistance: {
    fontSize: 14,
    fontWeight: "500",
  },
  feedItemScientific: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 6,
  },
  feedItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taxaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  taxaChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedItemMetaText: {
    fontSize: 12,
    flex: 1,
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

