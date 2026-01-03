import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { useTheme } from "../utils/theme";

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
  const theme = useTheme();
  
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
            backgroundColor: theme.background.card,
          },
        ]}
      >
        <Text
          style={[
            styles.count,
            {
              color: theme.text.primary,
            },
          ]}
          numberOfLines={1}
        >
          {count}
        </Text>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  count: {
    fontSize: 11,
    fontWeight: "bold",
  },
});

