import React from "react";
import { View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import type { Observation } from "../types/observation";
import { getTaxaColor } from "../utils/colors";

interface ObservationMarkerProps {
  observation: Observation;
  onPress: (observation: Observation) => void;
  coordinate?: {
    latitude: number;
    longitude: number;
  };
}

export const ObservationMarker: React.FC<ObservationMarkerProps> = ({
  observation,
  onPress,
}) => {
  const color = getTaxaColor(observation.taxaBucket);
  
  // Expose coordinate prop for clustering library detection
  const coordinate = {
    latitude: observation.lat,
    longitude: observation.lng,
  };

  return (
    <Marker
      coordinate={coordinate}
      onPress={() => onPress(observation)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.container}>
        <View style={[styles.marker, { backgroundColor: color }]} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});

