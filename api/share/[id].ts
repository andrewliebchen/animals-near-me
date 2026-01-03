import type { VercelRequest, VercelResponse } from "@vercel/node";
import { normalizeInat } from "../../server/providers/normalize";
import type { Observation } from "../../src/types/observation";

const INAT_BASE_URL = "https://api.inaturalist.org/v1";

/**
 * Fetch a single iNaturalist observation by ID
 */
async function fetchInatById(id: number): Promise<Observation | null> {
  try {
    const url = new URL(`${INAT_BASE_URL}/observations/${id}`);
    url.searchParams.set(
      "fields",
      "id,observed_on_string,time_observed_at,location,place_guess,taxon,photos"
    );

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Single observation endpoint returns the observation directly, not in results array
    const observation = data.results?.[0] || data;
    if (!observation.location) {
      // Observation not georeferenced
      return null;
    }

    return normalizeInat(observation);
  } catch (error) {
    console.error("Error fetching iNaturalist observation:", error);
    return null;
  }
}

/**
 * Fetch eBird observation by ID
 * Note: eBird doesn't have a direct endpoint for single observations.
 * For now, we return null - this would require location context to work properly.
 */
async function fetchEbirdById(id: string): Promise<Observation | null> {
  // eBird API doesn't support fetching a single observation by obsId directly
  // This would require location context or a different approach
  // For MVP, we'll return null and handle gracefully
  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid observation ID" });
    }

    // Parse observation ID format: "provider-providerId"
    const parts = id.split("-");
    if (parts.length < 2) {
      return res.status(400).json({ error: "Invalid observation ID format" });
    }

    const provider = parts[0];
    const providerId = parts.slice(1).join("-"); // Handle IDs that might contain dashes

    let observation: Observation | null = null;

    // Fetch observation based on provider
    if (provider === "inat") {
      const numericId = parseInt(providerId, 10);
      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid iNaturalist observation ID" });
      }
      observation = await fetchInatById(numericId);
    } else if (provider === "ebird") {
      // eBird observations can't be fetched directly by ID without location context
      // For MVP, return error for eBird observations
      return res.status(501).json({ 
        error: "Sharing eBird observations is not yet supported",
        message: "eBird API doesn't support fetching observations by ID directly"
      });
    } else {
      return res.status(400).json({ error: "Unknown provider" });
    }

    if (!observation) {
      return res.status(404).json({ error: "Observation not found" });
    }

    // Check if request wants JSON (from app) or redirect (from browser)
    const wantsJson = req.headers.accept?.includes("application/json") || 
                     req.query.format === "json";

    if (wantsJson) {
      // Return JSON for app requests
      return res.status(200).json({ observation });
    } else {
      // Redirect to deep link for browser requests
      const deepLink = `animals-near-me://observation/${id}`;
      return res.redirect(302, deepLink);
    }
  } catch (error) {
    console.error("Error in share endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

