import React from "react";
import { Marker } from "react-native-maps";
import type { Observation } from "../types/observation";
import { getTaxaColor } from "../utils/colors";

interface ObservationMarkerProps {
  observation: Observation;
  onPress: (observation: Observation) => void;
}

export const ObservationMarker: React.FC<ObservationMarkerProps> = ({
  observation,
  onPress,
}) => {
  const color = getTaxaColor(observation.taxaBucket);

  return (
    <Marker
      coordinate={{
        latitude: observation.lat,
        longitude: observation.lng,
      }}
      onPress={() => onPress(observation)}
      pinColor={color}
      tracksViewChanges={false}
    />
  );
};

