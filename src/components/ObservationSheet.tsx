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
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import ImageViewing from "react-native-image-viewing";
import type { Observation } from "../types/observation";
import type { WikipediaSummary } from "../types/wikipedia";
import { getTaxaColor } from "../utils/colors";
import { fetchWikipediaSummary } from "../api/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
import { normalizeWikipediaTitle } from "../utils/wikipedia";
import { useTheme } from "../utils/theme";

interface ObservationSheetProps {
  observation: Observation | null;
  onClose: () => void;
}

export const ObservationSheet: React.FC<ObservationSheetProps> = ({
  observation,
  onClose,
}) => {
  const theme = useTheme();
  const snapPoints = useMemo(() => ["40%", "90%"], []);
  const sheetRef = React.useRef<BottomSheet>(null);
  const [isSheetReady, setIsSheetReady] = useState(false);
  
  const [wikipediaData, setWikipediaData] = useState<WikipediaSummary | null>(null);
  const [wikipediaLoading, setWikipediaLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedObservationId, setDisplayedObservationId] = useState<string | null>(null);

  // Callback ref to know when BottomSheet is mounted
  const setSheetRef = React.useCallback((ref: BottomSheet | null) => {
    sheetRef.current = ref;
    setIsSheetReady(!!ref);
  }, []);

  // Effect to open/close sheet when observation changes
  React.useEffect(() => {
    if (observation) {
      const openSheet = () => {
        if (sheetRef.current) {
          sheetRef.current.snapToIndex(0);
        }
      };
      
      // If sheet is ready, open it with a small delay to ensure it's fully mounted
      if (isSheetReady && sheetRef.current) {
        setTimeout(openSheet, 100);
      }
    } else {
      if (sheetRef.current) {
        sheetRef.current.close();
      }
    }
  }, [observation, isSheetReady]);

  // Effect to open sheet when it becomes ready (if we have an observation waiting)
  React.useEffect(() => {
    if (isSheetReady && observation && sheetRef.current) {
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.snapToIndex(0);
        }
      }, 100);
    }
  }, [isSheetReady, observation]);

  // Track observation changes and show loading state during transitions
  useEffect(() => {
    if (observation) {
      // If this is a different observation, show loading state
      if (displayedObservationId !== observation.id) {
        setIsTransitioning(true);
        setDisplayedObservationId(observation.id);
        // Clear transition state after a brief delay to allow content to render
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }
    } else {
      setDisplayedObservationId(null);
      setIsTransitioning(false);
    }
  }, [observation, displayedObservationId]);

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

  const handleShare = async () => {
    try {
      const shareUrl = `${API_URL}/share/${observation.id}`;
      await Share.share({
        message: shareUrl,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing:", error);
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

  const dynamicStyles = {
    content: {
      ...styles.content,
      backgroundColor: theme.background.card,
    },
    imageContainer: {
      ...styles.imageContainer,
      backgroundColor: theme.background.secondary,
    },
    commonName: {
      ...styles.commonName,
      color: theme.text.primary,
    },
    scientificName: {
      ...styles.scientificName,
      color: theme.text.secondary,
    },
    label: {
      ...styles.label,
      color: theme.text.secondary,
    },
    value: {
      ...styles.value,
      color: theme.text.primary,
    },
    linkButton: {
      ...styles.linkButton,
      backgroundColor: theme.background.button,
    },
    wikipediaSection: {
      ...styles.wikipediaSection,
    },
    wikipediaExtract: {
      ...styles.wikipediaExtract,
      color: theme.text.primary,
    },
    loadingText: {
      ...styles.loadingText,
      color: theme.text.secondary,
    },
    loadingOverlay: {
      ...styles.loadingOverlay,
      backgroundColor: theme.background.card,
      opacity: 0.95,
    },
  };

  return (
    <>
    <BottomSheet
      ref={setSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={() => {}}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 80 }}
      backgroundStyle={{ backgroundColor: theme.background.card }}
    >
      <BottomSheetScrollView style={dynamicStyles.content}>
        {/* Loading overlay during transition */}
        {isTransitioning && (
          <View style={dynamicStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.text.primary} />
            <Text style={[styles.loadingOverlayText, { color: theme.text.secondary }]}>
              Loading...
            </Text>
          </View>
        )}

        {/* Content - hide during transition to prevent showing old data */}
        {!isTransitioning && (
          <>
            {/* Hero Image */}
            {observation.photoUrl && (
          <TouchableOpacity
            style={dynamicStyles.imageContainer}
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

        {/* Names and Share Button */}
        <View style={styles.header}>
          <View style={styles.nameSection}>
            <Text style={dynamicStyles.commonName}>
              {observation.commonName || observation.scientificName || "Unknown"}
            </Text>
            {observation.scientificName && (
              <Text style={dynamicStyles.scientificName}>
                {observation.scientificName}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Taxa Bucket and Provider Badge */}
        <View style={styles.section}>
          <View style={styles.categoryRow}>
            <View style={[styles.taxaChip, { borderColor: color }]}>
              <Text style={[styles.taxaText, { color }]}>
                {observation.taxaBucket}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{providerName}</Text>
            </View>
          </View>
        </View>

        {/* Observed Date/Time */}
        <View style={styles.section}>
          <Text style={dynamicStyles.label}>Observed</Text>
          <Text style={dynamicStyles.value}>{formatDate(observation.observedAt)}</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={dynamicStyles.label}>Location</Text>
          <Text style={dynamicStyles.value}>
            {observation.placeGuess ||
              `${observation.lat.toFixed(4)}, ${observation.lng.toFixed(4)}`}
          </Text>
        </View>

        {/* External Link */}
        {observation.detailUrl && (
          <TouchableOpacity
            style={dynamicStyles.linkButton}
            onPress={handleOpenDetail}
          >
            <Text style={styles.linkText}>View on {providerName} →</Text>
          </TouchableOpacity>
        )}

        {/* Wikipedia Section */}
        {wikipediaLoading && (
          <View style={dynamicStyles.wikipediaSection}>
            <Text style={dynamicStyles.label}>About</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.text.secondary} />
              <Text style={[dynamicStyles.loadingText, { marginLeft: 8 }]}>Loading information...</Text>
            </View>
          </View>
        )}

        {!wikipediaLoading && wikipediaData && wikipediaData.extract && (
          <View style={dynamicStyles.wikipediaSection}>
            <Text style={dynamicStyles.label}>About</Text>
            <Text style={dynamicStyles.wikipediaExtract}>{wikipediaData.extract}</Text>
            {wikipediaData.content_urls?.desktop?.page && (
              <TouchableOpacity
                style={dynamicStyles.linkButton}
                onPress={() => {
                  Linking.openURL(wikipediaData.content_urls!.desktop!.page);
                }}
              >
                <Text style={styles.linkText}>
                  Read more on Wikipedia →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
          </>
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
  shareButton: {
    padding: 4,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commonName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: "italic",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  taxaChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  taxaText: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 8,
    padding: 12,
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
  },
  wikipediaExtract: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    minHeight: 200,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 16,
  },
});

