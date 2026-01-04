import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../utils/theme";
import { countActiveFilters } from "../types/filters";
import type { FilterParams } from "../types/filters";

interface HeaderProps {
  activeView: "map" | "feed";
  onViewChange: (view: "map" | "feed") => void;
  filters: FilterParams;
  onFilterPress: () => void;
  showBackground: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  filters,
  onFilterPress,
  showBackground,
}) => {
  const theme = useTheme();

  // Memoize tab container styles to prevent re-renders
  const tabsContainerStyle = useMemo(
    () => [
      styles.tabsContainer,
      {
        backgroundColor: theme.background.card,
        shadowColor: theme.shadow.color,
        shadowOpacity: theme.shadow.opacity,
      },
    ],
    [theme.background.card, theme.shadow.color, theme.shadow.opacity]
  );

  // Memoize filter button styles
  const filterButtonStyle = useMemo(
    () => [
      styles.filterButton,
      {
        backgroundColor: theme.background.card,
        shadowColor: theme.shadow.color,
        shadowOpacity: theme.shadow.opacity,
      },
    ],
    [theme.background.card, theme.shadow.color, theme.shadow.opacity]
  );

  // Memoize gradient colors to prevent recalculation
  const gradientColors = useMemo(() => {
    if (!showBackground) return null;
    const bgColor = theme.background.primary;
    // Convert hex to rgba for gradient
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    return [
      hexToRgba(bgColor, 0.95), // Top: almost opaque
      hexToRgba(bgColor, 0.95), // 50%: keep opaque
      hexToRgba(bgColor, 0),     // Bottom: transparent
    ];
  }, [showBackground, theme.background.primary]);

  const headerContent = (
    <View style={styles.headerContent}>
      {/* Tabs - Single Pill */}
      <View style={tabsContainerStyle}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeView === "map" && styles.tabActive,
            {
              backgroundColor:
                activeView === "map" ? theme.background.button : "transparent",
            },
          ]}
          onPress={() => onViewChange("map")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeView === "map"
                    ? theme.text.primary
                    : theme.text.secondary,
              },
            ]}
            allowFontScaling={true}
          >
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeView === "feed" && styles.tabActive,
            {
              backgroundColor:
                activeView === "feed" ? theme.background.button : "transparent",
            },
          ]}
          onPress={() => onViewChange("feed")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeView === "feed"
                    ? theme.text.primary
                    : theme.text.secondary,
              },
            ]}
            allowFontScaling={true}
          >
            Feed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Button - Only show in feed view, aligned right */}
      {activeView === "feed" && (
        <TouchableOpacity
          style={filterButtonStyle}
          onPress={onFilterPress}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.filterButtonText, { color: theme.text.primary }]}
            allowFontScaling={true}
          >
            Filter
          </Text>
          {countActiveFilters(filters) > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText} allowFontScaling={true}>
                {countActiveFilters(filters)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (showBackground && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]} // White stops at 50%
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerOverlay}
        pointerEvents="box-none"
      >
        {headerContent}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.headerOverlay} pointerEvents="box-none">
      {headerContent}
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
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    // Active state handled by backgroundColor in component
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
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
});

