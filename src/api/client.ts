import type { ViewportParams } from "../utils/viewport";
import type { Observation } from "../types/observation";
import type { WikipediaSummary } from "../types/wikipedia";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export interface FetchObservationsResponse {
  observations: Observation[];
}

/**
 * Fetch observations from server based on viewport
 */
export async function fetchObservations(
  viewport: ViewportParams
): Promise<Observation[]> {
  const params = new URLSearchParams({
    lat: viewport.lat.toString(),
    lng: viewport.lng.toString(),
    latDelta: viewport.latDelta.toString(),
    lngDelta: viewport.lngDelta.toString(),
  });

  const url = `${API_URL}/observations?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: FetchObservationsResponse = await response.json();
    return data.observations || [];
  } catch (error) {
    console.error("Error fetching observations:", error);
    throw error;
  }
}

/**
 * Fetch Wikipedia summary for an animal name
 */
export async function fetchWikipediaSummary(
  title: string
): Promise<WikipediaSummary | null> {
  if (!title) {
    return null;
  }

  const encodedTitle = encodeURIComponent(title);
  const url = `${API_URL}/wikipedia?title=${encodedTitle}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Article not found - return null
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: WikipediaSummary = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Wikipedia summary:", error);
    return null;
  }
}

