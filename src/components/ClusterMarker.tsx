import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";

interface ClusterMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  count: number;
  onPress: () => void;
}

export const ClusterMarker: React.FC<ClusterMarkerProps> = ({
  coordinate,
  count,
  onPress,
}) => {
  console.log("[ClusterMarker] Rendering cluster:", {
    coordinate,
    count,
    hasOnPress: !!onPress,
  });

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: "#3B82F6",
            borderColor: "#FFFFFF",
          },
        ]}
      >
        <Text style={styles.count} numberOfLines={1}>
          {count}
        </Text>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

