import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Linking,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import ImageViewing from "react-native-image-viewing";
import type { Observation } from "../types/observation";
import type { WikipediaSummary } from "../types/wikipedia";
import { getTaxaColor } from "../utils/colors";
import { fetchWikipediaSummary } from "../api/client";
import { normalizeWikipediaTitle } from "../utils/wikipedia";

interface ObservationSheetProps {
  observation: Observation | null;
  onClose: () => void;
}

export const ObservationSheet: React.FC<ObservationSheetProps> = ({
  observation,
  onClose,
}) => {
  const snapPoints = useMemo(() => ["40%", "90%"], []);
  const sheetRef = React.useRef<BottomSheet>(null);
  
  const [wikipediaData, setWikipediaData] = useState<WikipediaSummary | null>(null);
  const [wikipediaLoading, setWikipediaLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  React.useEffect(() => {
    if (observation) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [observation]);

  // Fetch Wikipedia data when observation changes
  useEffect(() => {
    if (!observation) {
      setWikipediaData(null);
      setWikipediaLoading(false);
      return;
    }

    const fetchWikipedia = async () => {
      setWikipediaLoading(true);
      setWikipediaData(null);

      // Try common name first, then scientific name
      const titlesToTry = [];
      
      if (observation.commonName) {
        const normalizedCommon = normalizeWikipediaTitle(observation.commonName);
        titlesToTry.push(normalizedCommon);
      }
      
      if (observation.scientificName) {
        const normalizedScientific = normalizeWikipediaTitle(observation.scientificName);
        // Only add if different from common name
        if (!titlesToTry.includes(normalizedScientific)) {
          titlesToTry.push(normalizedScientific);
        }
      }

      if (titlesToTry.length === 0) {
        setWikipediaLoading(false);
        return;
      }

      // Try each title in order
      for (const title of titlesToTry) {
        try {
          const summary = await fetchWikipediaSummary(title);
          if (summary && summary.extract) {
            setWikipediaData(summary);
            setWikipediaLoading(false);
            return;
          }
        } catch (error) {
          // Continue to next title
          continue;
        }
      }

      // If we get here, no article was found
      setWikipediaLoading(false);
      setWikipediaData(null);
    };

    fetchWikipedia();
  }, [observation]);

  if (!observation) {
    return null;
  }

  const color = getTaxaColor(observation.taxaBucket);
  const providerName = observation.provider === "ebird" ? "eBird" : "iNaturalist";

  const handleOpenDetail = () => {
    if (observation.detailUrl) {
      Linking.openURL(observation.detailUrl);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: "#DDD", width: 80 }}
    >
      <BottomSheetScrollView style={styles.content}>
        {/* Hero Image */}
        {observation.photoUrl && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setImageViewerVisible(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: observation.photoUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Names and Provider Badge */}
        <View style={styles.header}>
          <View style={styles.nameSection}>
            <Text style={styles.commonName}>
              {observation.commonName || observation.scientificName || "Unknown"}
            </Text>
            {observation.scientificName && (
              <Text style={styles.scientificName}>
                {observation.scientificName}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{providerName}</Text>
          </View>
        </View>

        {/* Taxa Bucket */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={[styles.taxaChip, { borderColor: color }]}>
            <Text style={[styles.taxaText, { color }]}>
              {observation.taxaBucket}
            </Text>
          </View>
        </View>

        {/* Observed Date/Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Observed</Text>
          <Text style={styles.value}>{formatDate(observation.observedAt)}</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            {observation.placeGuess ||
              `${observation.lat.toFixed(4)}, ${observation.lng.toFixed(4)}`}
          </Text>
        </View>

        {/* External Link */}
        {observation.detailUrl && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleOpenDetail}
          >
            <Text style={styles.linkText}>View on {providerName} →</Text>
          </TouchableOpacity>
        )}

        {/* Wikipedia Section */}
        {wikipediaLoading && (
          <View style={styles.wikipediaSection}>
            <Text style={styles.label}>About</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={[styles.loadingText, { marginLeft: 8 }]}>Loading information...</Text>
            </View>
          </View>
        )}

        {!wikipediaLoading && wikipediaData && wikipediaData.extract && (
          <View style={styles.wikipediaSection}>
            <Text style={styles.label}>About</Text>
            <Text style={styles.wikipediaExtract}>{wikipediaData.extract}</Text>
            {wikipediaData.content_urls?.desktop?.page && (
              <TouchableOpacity
                style={styles.wikipediaLink}
                onPress={() => {
                  Linking.openURL(wikipediaData.content_urls!.desktop!.page);
                }}
              >
                <Text style={styles.wikipediaLinkText}>
                  Read more on Wikipedia →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>

    {observation.photoUrl && (
      <ImageViewing
        images={[{ uri: observation.photoUrl }]}
        imageIndex={0}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />
    )}
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  nameSection: {
    flex: 1,
    marginRight: 12,
  },
  commonName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#6B7280",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#111827",
  },
  taxaChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  taxaText: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  linkText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  wikipediaSection: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 24,
    paddingBottom: 60,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  wikipediaExtract: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 12,
  },
  wikipediaLink: {
    marginTop: 8,
  },
  wikipediaLinkText: {
    fontSize: 15,
    color: "#3B82F6",
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

