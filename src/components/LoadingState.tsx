import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useTheme } from "../utils/theme";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
}) => {
  const theme = useTheme();

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background.card,
      shadowColor: theme.shadow.color,
      shadowOpacity: theme.shadow.opacity,
    },
    text: {
      ...styles.text,
      color: theme.text.secondary,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <ActivityIndicator size="small" color="#3B82F6" />
      <Text style={dynamicStyles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 70,
    left: 16,
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
    zIndex: 1000,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});


