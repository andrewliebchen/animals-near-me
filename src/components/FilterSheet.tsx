import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import type { FilterParams, RecencyFilter } from "../types/filters";
import type { TaxaBucket, Provider } from "../types/observation";
import { TAXA_COLORS } from "../utils/colors";
import { DEFAULT_FILTERS, countActiveFilters } from "../types/filters";
import { useTheme } from "../utils/theme";

interface FilterSheetProps {
  visible: boolean;
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  onClose: () => void;
}

const RECENCY_OPTIONS: Array<{ value: RecencyFilter; label: string }> = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const TAXA_OPTIONS: TaxaBucket[] = [
  "Bird",
  "Mammal",
  "Reptile",
  "Amphibian",
  "Fish",
  "Insect",
  "Arachnid",
  "Mollusk",
  "Plant",
  "Fungi",
  "Other",
];

const PROVIDER_OPTIONS: Array<{ value: Provider; label: string }> = [
  { value: "ebird", label: "eBird" },
  { value: "inat", label: "iNaturalist" },
  { value: "obis", label: "OBIS" },
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  filters,
  onFiltersChange,
  onClose,
}) => {
  const theme = useTheme();
  const snapPoints = useMemo(() => ["100%"], []);
  const sheetRef = React.useRef<BottomSheet>(null);
  const [localFilters, setLocalFilters] = useState<FilterParams>(filters);

  // Update local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Control sheet visibility
  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleRecencyChange = (value: RecencyFilter) => {
    setLocalFilters({ ...localFilters, recency: value });
  };

  const handleHasPhotoChange = (value: boolean | null) => {
    setLocalFilters({ ...localFilters, hasPhoto: value });
  };

  const handleTaxaToggle = (taxa: TaxaBucket) => {
    const currentTaxa = localFilters.taxa;
    const newTaxa = currentTaxa.includes(taxa)
      ? currentTaxa.filter((t) => t !== taxa)
      : [...currentTaxa, taxa];
    setLocalFilters({ ...localFilters, taxa: newTaxa });
  };

  const handleProviderToggle = (provider: Provider, enabled: boolean) => {
    const currentProvider = localFilters.provider;
    const newProvider = enabled
      ? [...currentProvider.filter((p) => p !== provider), provider]
      : currentProvider.filter((p) => p !== provider);
    setLocalFilters({ ...localFilters, provider: newProvider });
  };

  const handleShowNewOnlyChange = (value: boolean) => {
    setLocalFilters({ ...localFilters, showNewOnly: value });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
    onClose();
  };

  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);
  const activeCount = countActiveFilters(localFilters);

  const dynamicStyles = {
    title: {
      ...styles.title,
      color: theme.text.primary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: theme.text.primary,
    },
    switchLabel: {
      ...styles.switchLabel,
      color: theme.text.primary,
    },
    recencyButton: {
      ...styles.recencyButton,
      backgroundColor: theme.background.button,
      borderColor: theme.border,
    },
    recencyButtonText: {
      ...styles.recencyButtonText,
      color: theme.text.secondary,
    },
    taxaChip: {
      ...styles.taxaChip,
      backgroundColor: theme.background.card,
    },
    taxaChipText: {
      ...styles.taxaChipText,
    },
    clearFilterText: {
      ...styles.clearFilterText,
      color: "#3B82F6", // Keep blue for links
    },
    actionContainer: {
      ...styles.actionContainer,
      backgroundColor: theme.background.card,
      borderTopColor: theme.border,
    },
    clearButton: {
      ...styles.clearButton,
      backgroundColor: theme.background.button,
    },
    clearButtonText: {
      ...styles.clearButtonText,
      color: theme.text.secondary,
    },
    applyButtonDisabled: {
      ...styles.applyButtonDisabled,
      backgroundColor: theme.background.button,
    },
    applyButtonTextDisabled: {
      ...styles.applyButtonTextDisabled,
      color: theme.text.muted,
    },
  };

  const footerComponent = () => (
    <BottomSheetView style={dynamicStyles.actionContainer}>
      <TouchableOpacity
        style={[styles.button, dynamicStyles.clearButton]}
        onPress={handleClear}
      >
        <Text style={dynamicStyles.clearButtonText} allowFontScaling={true}>Clear All</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          styles.applyButton,
          !hasChanges && dynamicStyles.applyButtonDisabled,
        ]}
        onPress={handleApply}
        disabled={!hasChanges}
      >
        <Text
          style={[
            styles.applyButtonText,
            !hasChanges && dynamicStyles.applyButtonTextDisabled,
          ]}
          allowFontScaling={true}
        >
          Apply {activeCount > 0 && `(${activeCount})`}
        </Text>
      </TouchableOpacity>
    </BottomSheetView>
  );

  // Create diffuse shadow that works in both light and dark modes
  // Creates a subtle "step-off" effect from the background
  const isDark = theme.background.primary === "#000000";
  
  // In dark mode, use a subtle light shadow for separation
  // In light mode, use a soft dark shadow
  const shadowColor = isDark 
    ? "rgba(255, 255, 255, 0.08)"  // Subtle white glow in dark mode
    : "rgba(0, 0, 0, 0.12)";       // Soft black shadow in light mode
  
  const shadowStyle = {
    backgroundColor: theme.background.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor,
    shadowOffset: { width: 0, height: -2 }, // Slight upward shadow
    shadowOpacity: 1,
    shadowRadius: 20, // Large radius for diffuse effect
    elevation: 16, // Android shadow - higher for more prominence
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={() => {}}
      enableDynamicSizing={false}
      topInset={130}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 80 }}
      backgroundStyle={shadowStyle}
      footerComponent={footerComponent}
      enableOverDrag={false}
    >
      <View style={styles.container}>
        <BottomSheetScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <Text style={dynamicStyles.title} allowFontScaling={true}>Filter Observations</Text>

          {/* Recency Filter */}
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle} allowFontScaling={true}>Recency</Text>
            <View style={styles.recencyContainer}>
              {RECENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    dynamicStyles.recencyButton,
                    localFilters.recency === option.value && styles.recencyButtonActive,
                  ]}
                  onPress={() => handleRecencyChange(option.value)}
                >
                  <Text
                    style={[
                      dynamicStyles.recencyButtonText,
                      localFilters.recency === option.value && styles.recencyButtonTextActive,
                    ]}
                    allowFontScaling={true}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photo Filter */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={dynamicStyles.switchLabel} allowFontScaling={true}>Has user-submitted photo</Text>
              <Switch
                value={localFilters.hasPhoto === true}
                onValueChange={(value) => {
                  handleHasPhotoChange(value ? true : null);
                }}
                trackColor={{ false: theme.border, true: "#3B82F6" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={dynamicStyles.switchLabel} allowFontScaling={true}>Hide seen observations</Text>
              <Switch
                value={localFilters.showNewOnly || false}
                onValueChange={handleShowNewOnlyChange}
                trackColor={{ false: theme.border, true: "#3B82F6" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Taxa Filter */}
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle} allowFontScaling={true}>Categories</Text>
            <View style={styles.taxaGrid}>
              {TAXA_OPTIONS.map((taxa) => {
                const isSelected = localFilters.taxa.includes(taxa);
                const color = TAXA_COLORS[taxa];
                return (
                  <TouchableOpacity
                    key={taxa}
                    style={[
                      dynamicStyles.taxaChip,
                      { borderColor: color },
                      isSelected && { backgroundColor: color + "20" },
                    ]}
                    onPress={() => handleTaxaToggle(taxa)}
                  >
                    <Text
                      style={[
                        dynamicStyles.taxaChipText,
                        { color: isSelected ? color : theme.text.secondary },
                      ]}
                      allowFontScaling={true}
                    >
                      {taxa}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: color }]}>
                        <Text style={styles.checkmarkText} allowFontScaling={true}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {localFilters.taxa.length > 0 && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setLocalFilters({ ...localFilters, taxa: [] })}
              >
                <Text style={dynamicStyles.clearFilterText} allowFontScaling={true}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Provider Filter */}
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle} allowFontScaling={true}>Data Source</Text>
            {PROVIDER_OPTIONS.map((option) => {
              const isSelected = localFilters.provider.includes(option.value);
              return (
                <View key={option.value} style={styles.switchRow}>
                  <Text style={dynamicStyles.switchLabel} allowFontScaling={true}>{option.label}</Text>
                  <Switch
                    value={isSelected}
                    onValueChange={(value) => handleProviderToggle(option.value, value)}
                    trackColor={{ false: theme.border, true: "#3B82F6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 24,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  recencyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recencyButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  recencyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  recencyButtonTextActive: {
    color: "#FFFFFF",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#111827",
  },
  taxaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  taxaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  taxaChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  clearFilterButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearFilterText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40, // Extra padding for home bar
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#F3F4F6",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  applyButton: {
    backgroundColor: "#3B82F6",
  },
  applyButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  applyButtonTextDisabled: {
    color: "#9CA3AF",
  },
});

