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

/**
 * Calculate distance between two points in km (Haversine formula)
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



