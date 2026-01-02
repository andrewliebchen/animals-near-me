import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { TAXA_COLORS } from "../utils/colors";
import type { TaxaBucket } from "../types/observation";
import { useTheme } from "../utils/theme";

interface ColorLegendProps {
  visible: boolean;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({ visible }) => {
  const theme = useTheme();

  if (!visible) return null;

  const taxaBuckets = Object.keys(TAXA_COLORS) as TaxaBucket[];

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background.card,
      shadowColor: theme.shadow.color,
      shadowOpacity: theme.shadow.opacity,
    },
    title: {
      ...styles.title,
      color: theme.text.secondary,
    },
    legendText: {
      ...styles.legendText,
      color: theme.text.primary,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.legend}>
          {taxaBuckets.map((bucket) => (
            <View key={bucket} style={styles.legendItem}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: TAXA_COLORS[bucket] },
                ]}
              />
              <Text style={dynamicStyles.legendText}>{bucket}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
});


