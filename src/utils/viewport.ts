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

/**
 * Calculate bearing (azimuth) from point 1 to point 2 in degrees
 * Returns bearing in degrees (0-360), where 0 is North
 */
export function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Validate inputs
  if (
    !isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2) ||
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)
  ) {
    return 0; // Default to North if invalid
  }

  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;
  
  // Normalize to 0-360
  const normalized = (bearingDeg + 360) % 360;
  
  // Validate result
  if (!isFinite(normalized) || isNaN(normalized)) {
    return 0;
  }
  
  return normalized;
}



