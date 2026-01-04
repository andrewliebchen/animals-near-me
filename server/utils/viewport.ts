export interface Viewport {
  lat: number;
  lng: number;
  latDelta: number;
  lngDelta: number;
}

export interface BoundingBox {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
}

export interface CenterRadius {
  center: { lat: number; lng: number };
  radiusKm: number;
}

/**
 * Convert viewport to bounding box
 */
export function viewportToBoundingBox(viewport: Viewport): BoundingBox {
  const { lat, lng, latDelta, lngDelta } = viewport;
  
  return {
    ne: {
      lat: lat + latDelta / 2,
      lng: lng + lngDelta / 2,
    },
    sw: {
      lat: lat - latDelta / 2,
      lng: lng - lngDelta / 2,
    },
  };
}

/**
 * Convert viewport to center + radius (approximate)
 */
export function viewportToCenterRadius(viewport: Viewport): CenterRadius {
  const { lat, lng, latDelta, lngDelta } = viewport;
  
  // Approximate radius in km
  // Using average of lat/lng deltas and converting to km
  const avgDelta = (latDelta + lngDelta) / 2;
  // Rough conversion: 1 degree ≈ 111 km
  const radiusKm = (avgDelta * 111) / 2;
  
  return {
    center: { lat, lng },
    radiusKm: Math.min(radiusKm, 50), // Cap at 50km for eBird
  };
}

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



