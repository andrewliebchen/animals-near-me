import type { Region } from "react-native-maps";

export interface ViewportParams {
  lat: number;
  lng: number;
  latDelta: number;
  lngDelta: number;
}

/**
 * Convert React Native Maps region to viewport params for API
 */
export function regionToViewportParams(region: Region): ViewportParams {
  return {
    lat: region.latitude,
    lng: region.longitude,
    latDelta: region.latitudeDelta,
    lngDelta: region.longitudeDelta,
  };
}

/**
 * Default region (SF Bay Area)
 */
export const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};



