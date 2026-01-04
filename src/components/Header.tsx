import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../utils/theme";
import type { FilterParams } from "../types/filters";

interface HeaderProps {
  filters: FilterParams;
  onFilterPress: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterPress,
  isLoading = false,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.headerOverlay} pointerEvents="box-none">
      <View style={styles.headerContent} pointerEvents="box-none">
        {isLoading && (
          <View style={styles.loadingContainer} pointerEvents="auto">
            <ActivityIndicator size="small" color={theme.text.primary} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    paddingTop: 70,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  filterButton: {
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});

