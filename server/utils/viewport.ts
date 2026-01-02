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



