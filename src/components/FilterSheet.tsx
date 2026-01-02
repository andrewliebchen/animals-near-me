import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { FilterParams, RecencyFilter } from "../types/filters";
import type { TaxaBucket, Provider } from "../types/observation";
import { TAXA_COLORS } from "../utils/colors";
import { DEFAULT_FILTERS, countActiveFilters } from "../types/filters";

interface FilterSheetProps {
  visible: boolean;
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  onClose: () => void;
}

const RECENCY_OPTIONS: Array<{ value: RecencyFilter; label: string }> = [
  { value: null, label: "All Time" },
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
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  filters,
  onFiltersChange,
  onClose,
}) => {
  const snapPoints = useMemo(() => ["70%", "90%"], []);
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

  const handleProviderToggle = (provider: Provider) => {
    const currentProvider = localFilters.provider;
    const newProvider = currentProvider.includes(provider)
      ? currentProvider.filter((p) => p !== provider)
      : [...currentProvider, provider];
    setLocalFilters({ ...localFilters, provider: newProvider });
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

  return (
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
        <Text style={styles.title}>Filter Observations</Text>

        {/* Recency Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recency</Text>
          <View style={styles.recencyContainer}>
            {RECENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value || "all"}
                style={[
                  styles.recencyButton,
                  localFilters.recency === option.value && styles.recencyButtonActive,
                ]}
                onPress={() => handleRecencyChange(option.value)}
              >
                <Text
                  style={[
                    styles.recencyButtonText,
                    localFilters.recency === option.value && styles.recencyButtonTextActive,
                  ]}
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
            <Text style={styles.sectionTitle}>Has Photo</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {localFilters.hasPhoto === null
                  ? "All"
                  : localFilters.hasPhoto
                  ? "Has Photo"
                  : "No Photo"}
              </Text>
              <Switch
                value={localFilters.hasPhoto === true}
                onValueChange={(value) => {
                  if (value) {
                    handleHasPhotoChange(true);
                  } else {
                    // Toggle between false and null
                    handleHasPhotoChange(
                      localFilters.hasPhoto === true ? null : false
                    );
                  }
                }}
                trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          {localFilters.hasPhoto !== null && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => handleHasPhotoChange(null)}
            >
              <Text style={styles.clearFilterText}>Show All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Taxa Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.taxaGrid}>
            {TAXA_OPTIONS.map((taxa) => {
              const isSelected = localFilters.taxa.includes(taxa);
              const color = TAXA_COLORS[taxa];
              return (
                <TouchableOpacity
                  key={taxa}
                  style={[
                    styles.taxaChip,
                    { borderColor: color },
                    isSelected && { backgroundColor: color + "20" },
                  ]}
                  onPress={() => handleTaxaToggle(taxa)}
                >
                  <Text
                    style={[
                      styles.taxaChipText,
                      { color: isSelected ? color : "#6B7280" },
                    ]}
                  >
                    {taxa}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: color }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
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
              <Text style={styles.clearFilterText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Provider Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Source</Text>
          <View style={styles.providerContainer}>
            {PROVIDER_OPTIONS.map((option) => {
              const isSelected = localFilters.provider.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.providerButton,
                    isSelected && styles.providerButtonActive,
                  ]}
                  onPress={() => handleProviderToggle(option.value)}
                >
                  <Text
                    style={[
                      styles.providerButtonText,
                      isSelected && styles.providerButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Text style={styles.checkmarkText}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {localFilters.provider.length > 0 && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setLocalFilters({ ...localFilters, provider: [] })}
            >
              <Text style={styles.clearFilterText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.applyButton,
              !hasChanges && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!hasChanges}
          >
            <Text
              style={[
                styles.applyButtonText,
                !hasChanges && styles.applyButtonTextDisabled,
              ]}
            >
              Apply {activeCount > 0 && `(${activeCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 8,
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
  providerContainer: {
    flexDirection: "row",
    gap: 12,
  },
  providerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  providerButtonTextActive: {
    color: "#FFFFFF",
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
    marginTop: 8,
    marginBottom: 32,
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

