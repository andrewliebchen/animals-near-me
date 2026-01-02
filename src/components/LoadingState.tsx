import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useTheme } from "../utils/theme";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading observations...",
}) => {
  const theme = useTheme();

  const dynamicStyles = {
    text: {
      ...styles.text,
      color: theme.text.secondary,
    },
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={dynamicStyles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
  },
});


