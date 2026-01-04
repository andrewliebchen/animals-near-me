import React from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
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

  const loadingStyles = {
    container: {
      ...styles.loadingContainer,
      backgroundColor: theme.background.card,
      shadowColor: theme.shadow.color,
      shadowOpacity: theme.shadow.opacity,
    },
    text: {
      ...styles.loadingText,
      color: theme.text.secondary,
    },
  };

  return (
    <View style={styles.headerOverlay} pointerEvents="box-none">
      <View style={styles.headerContent} pointerEvents="box-none">
        {isLoading && (
          <View style={loadingStyles.container} pointerEvents="auto">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={loadingStyles.text} allowFontScaling={true}>Loading...</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

