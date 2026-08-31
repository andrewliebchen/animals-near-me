import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import type { Observation } from "../types/observation";
import { getTaxaColor } from "../utils/colors";
import { useTheme } from "../utils/theme";

interface ObservationListRowProps {
  observation: Observation;
  seen?: boolean;
  selected?: boolean;
  onPress: (observation: Observation) => void;
}

function providerLabel(provider: Observation["provider"]): string {
  if (provider === "ebird") return "eBird";
  if (provider === "obis") return "OBIS";
  return "iNaturalist";
}

function formatDistance(km?: number): string | undefined {
  if (km == null || !isFinite(km)) {
    return undefined;
  }
  if (km < 1) {
    return `${Math.max(1, Math.round(km * 1000))} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

function formatRelativeTime(iso?: string): string | undefined {
  if (!iso) {
    return undefined;
  }
  const then = new Date(iso).getTime();
  if (!isFinite(then)) {
    return undefined;
  }
  const sec = Math.max(0, (Date.now() - then) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export const ObservationListRow: React.FC<ObservationListRowProps> = ({
  observation,
  seen = false,
  selected = false,
  onPress,
}) => {
  const theme = useTheme();
  const color = getTaxaColor(observation.taxaBucket);
  const name = observation.commonName || observation.scientificName || "Unknown";
  const showScientific =
    Boolean(observation.scientificName) &&
    observation.scientificName !== observation.commonName;
  const distance = formatDistance(observation.distance);
  const relativeTime = formatRelativeTime(observation.observedAt);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        selected && { backgroundColor: theme.background.secondary },
        seen && styles.seen,
      ]}
      onPress={() => onPress(observation)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${name}${distance ? `, ${distance}` : ""}`}
    >
      {observation.photoUrl ? (
        <Image
          source={{ uri: observation.photoUrl }}
          style={styles.thumbnail}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: color }]}>
          <Text style={styles.placeholderLetter} allowFontScaling={true}>
            {observation.taxaBucket.charAt(0)}
          </Text>
          <Text style={styles.placeholderProvider} allowFontScaling={true}>
            {providerLabel(observation.provider)}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.commonName, { color: theme.text.primary }]}
            numberOfLines={1}
            allowFontScaling={true}
          >
            {name}
          </Text>
          {distance ? (
            <Text
              style={[styles.distance, { color: theme.text.secondary }]}
              allowFontScaling={true}
            >
              {distance}
            </Text>
          ) : null}
        </View>
        {showScientific ? (
          <Text
            style={[styles.scientificName, { color: theme.text.secondary }]}
            numberOfLines={1}
            allowFontScaling={true}
          >
            {observation.scientificName}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.taxaChip, { borderColor: color }]}>
            <Text style={[styles.taxaText, { color }]} allowFontScaling={true}>
              {observation.taxaBucket}
            </Text>
          </View>
          <Text
            style={[styles.meta, { color: theme.text.muted }]}
            numberOfLines={1}
            allowFontScaling={true}
          >
            {[providerLabel(observation.provider), relativeTime].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 80,
  },
  seen: {
    opacity: 0.55,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  placeholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  placeholderLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  placeholderProvider: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    opacity: 0.9,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  commonName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  distance: {
    fontSize: 13,
    fontWeight: "500",
  },
  scientificName: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  taxaChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  taxaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  meta: {
    flex: 1,
    fontSize: 12,
  },
});
