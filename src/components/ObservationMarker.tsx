import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
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
  offset?: {
    lat: number;
    lng: number;
  };
  selected?: boolean;
}

export const ObservationMarker: React.FC<ObservationMarkerProps> = ({
  observation,
  onPress,
  offset,
  selected = false,
}) => {
  const color = getTaxaColor(observation.taxaBucket);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  
  // Expose coordinate prop for clustering library detection
  // Apply offset if provided to spread out overlapping markers
  const coordinate = {
    latitude: observation.lat + (offset?.lat || 0),
    longitude: observation.lng + (offset?.lng || 0),
  };

  // Pulse animation when selected
  useEffect(() => {
    if (selected) {
      // Create a looping pulse animation
      const pulseAnimation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.4,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      // Reset animations when not selected
      pulseAnim.setValue(1);
      opacityAnim.setValue(0);
    }
  }, [selected, pulseAnim, opacityAnim]);

  const handlePress = () => {
    onPress(observation);
  };

  return (
    <Marker
      coordinate={coordinate}
      onPress={handlePress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.container}>
        {selected && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                backgroundColor: color,
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
              },
            ]}
          />
        )}
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
  pulseRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.6,
  },
});

