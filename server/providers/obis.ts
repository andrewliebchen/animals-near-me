import type { BoundingBox } from "../utils/viewport";
import { bboxToWktPolygon } from "../utils/viewport";
import { normalizeObis } from "./normalize";
import type { Observation } from "../../src/types/observation";

const OBIS_BASE_URL = "https://api.obis.org/v3";
const OTN_NODE_ID = "68f83ea7-69a7-44fd-be77-3c3afd6f3cf8";
const INAT_DATASET_ID = "eaea291a-1e1d-4382-b86f-ac3cc15b8d5a";
const MAX_RESULTS = 100;
const OTN_MIN_LOOKBACK_DAYS = 730;

const OBIS_FIELDS = [
  "id",
  "scientificName",
  "vernacularName",
  "eventDate",
  "decimalLatitude",
  "decimalLongitude",
  "class",
  "phylum",
  "kingdom",
  "datasetName",
  "dataset_id",
  "occurrenceID",
  "basisOfRecord",
  "associatedMedia",
  "aphiaID",
  "AphiaID",
  "institutionCode",
  "collectionCode",
  "locality",
  "references",
  "license",
  "absence",
  "dropped",
].join(",");

const REJECTED_BASIS = new Set(["PreservedSpecimen", "FossilSpecimen"]);

interface FetchObisOptions {
  bbox: BoundingBox;
  recentDays?: number;
}

/**
 * Fetch recent OBIS occurrences for a viewport.
 * Runs an OTN telemetry query and a general marine query in parallel,
 * then drops iNaturalist/eBird harvests, absences, and specimens.
 * OTN ingest lags, so telemetry uses at least a 2-year lookback.
 */
export async function fetchRecentObis(
  options: FetchObisOptions
): Promise<Observation[]> {
  const { bbox, recentDays = 7 } = options;
  const geometry = bboxToWktPolygon(bbox);
  const startDate = daysAgoIsoDate(recentDays);
  const otnStartDate = daysAgoIsoDate(
    Math.max(recentDays, OTN_MIN_LOOKBACK_DAYS)
  );

  const [otnRecords, generalRecords] = await Promise.all([
    fetchObisPage({
      geometry,
      startdate: otnStartDate,
      nodeid: OTN_NODE_ID,
    }),
    fetchObisPage({
      geometry,
      startdate: startDate,
    }),
  ]);

  const seen = new Set<string>();
  const merged: Observation[] = [];

  for (const record of [...otnRecords, ...generalRecords]) {
    if (!shouldKeepObisRecord(record)) {
      continue;
    }
    const observation = normalizeObis(record);
    if (!observation || seen.has(observation.id)) {
      continue;
    }
    seen.add(observation.id);
    merged.push(observation);
  }

  return merged;
}

/**
 * Fetch a single OBIS occurrence by UUID.
 */
export async function fetchObisById(id: string): Promise<Observation | null> {
  try {
    const url = `${OBIS_BASE_URL}/occurrence/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`OBIS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const record = data.results?.[0] || data;
    if (!record?.id) {
      return null;
    }

    return normalizeObis(record);
  } catch (error) {
    console.error("Error fetching OBIS occurrence:", error);
    return null;
  }
}

interface ObisPageParams {
  geometry: string;
  startdate: string;
  nodeid?: string;
}

async function fetchObisPage(params: ObisPageParams): Promise<any[]> {
  const url = new URL(`${OBIS_BASE_URL}/occurrence`);
  url.searchParams.set("geometry", params.geometry);
  url.searchParams.set("startdate", params.startdate);
  url.searchParams.set("size", MAX_RESULTS.toString());
  url.searchParams.set("fields", OBIS_FIELDS);
  if (params.nodeid) {
    url.searchParams.set("nodeid", params.nodeid);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`OBIS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error("Error fetching OBIS data:", error);
    return [];
  }
}

function shouldKeepObisRecord(record: any): boolean {
  if (!record) {
    return false;
  }

  if (record.absence === true || record.dropped === true) {
    return false;
  }

  const basis = String(record.basisOfRecord || "");
  if (REJECTED_BASIS.has(basis)) {
    return false;
  }

  const lat = Number(record.decimalLatitude);
  const lng = Number(record.decimalLongitude);
  if (!isFinite(lat) || !isFinite(lng)) {
    return false;
  }

  if (isInatHarvest(record) || isEbirdHarvest(record)) {
    return false;
  }

  return true;
}

function isInatHarvest(record: any): boolean {
  const institution = String(record.institutionCode || "").toLowerCase();
  const datasetId = String(record.dataset_id || "");
  const datasetName = String(record.datasetName || "").toLowerCase();
  const occurrenceId = String(record.occurrenceID || "").toLowerCase();
  const references = String(record.references || "").toLowerCase();

  return (
    institution === "inaturalist" ||
    datasetId === INAT_DATASET_ID ||
    datasetName.includes("inaturalist") ||
    occurrenceId.includes("inaturalist.org") ||
    references.includes("inaturalist.org")
  );
}

function isEbirdHarvest(record: any): boolean {
  const institution = String(record.institutionCode || "").toLowerCase();
  const collection = String(record.collectionCode || "").toLowerCase();
  const datasetName = String(record.datasetName || "").toLowerCase();
  const occurrenceId = String(record.occurrenceID || "").toLowerCase();

  return (
    collection === "ebird" ||
    datasetName.includes("ebird") ||
    institution.includes("cornell") ||
    occurrenceId.includes("ebird.org")
  );
}

function daysAgoIsoDate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split("T")[0];
}
