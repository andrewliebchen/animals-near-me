import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useObservationStore } from "../../src/store/observationStore";
import { fetchObservationById } from "../../src/api/client";

/**
 * Catch-all route for observation deep links
 * This prevents "Unmatched route" errors when deep links are opened.
 * Fetches the observation and redirects to index.
 */
export default function ObservationRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Catch-all route params are arrays, so get first element
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const setSelectedObservation = useObservationStore((state) => state.setSelectedObservation);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      router.replace("/");
      return;
    }

    // Fetch observation and set it, then redirect to index
    const handleObservation = async () => {
      try {
        const observation = await fetchObservationById(id);
        if (observation) {
          setSelectedObservation(observation);
        }
      } catch (error) {
        console.error("Error fetching observation from deep link:", error);
      } finally {
        // Always redirect to index after handling
        router.replace("/");
      }
    };

    handleObservation();
  }, [id, router, setSelectedObservation]);

  return null;
}

