import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../utils/theme";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const theme = useTheme();

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background.card,
      shadowColor: theme.shadow.color,
      shadowOpacity: theme.shadow.opacity,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <Text style={styles.errorText}>{error}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  retryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});


