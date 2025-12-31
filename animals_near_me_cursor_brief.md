# Animals Near Me (Personal MVP)

Expo iOS app (TestFlight) that renders nearby wildlife observations on a map by combining:
- iNaturalist observations (all taxa)
- eBird recent bird observations (birds)

This is a **personal-use app**. Clean architecture, pragmatic MVP.

---

## Goal
A map-first app where I can pan and zoom anywhere in the world and see wildlife observations.

Core experience:
- Map centered on my region by default (SF Bay Area)
- Observation dots from iNaturalist + eBird
- Color-coded by taxonomic bucket
- Tap a dot → bottom sheet with details and reference info

---

## Feasibility

### eBird
- Supports **recent nearby observations** via center + radius search
- Radius up to **50 km**, days back up to **30**
- Requires API key sent via `x-ebirdapitoken` header
- JSON responses, stable API

This is reliable and well-scoped for MVP.

### iNaturalist
- Uses `GET https://api.inaturalist.org/v1/observations`
- Supports georeferenced observations and photos
- Bounding-box or center+radius style querying
- Public read access (no auth needed)

Docs endpoint is occasionally flaky, so implement defensively and keep params modular.

---

## MVP Product Requirements

### Map
- Full-screen interactive map
- Pan and zoom worldwide
- Dots represent individual observations
- Dots colored by taxa bucket

### Interaction
- Tap dot → bottom sheet
- Bottom sheet includes:
  - Common name (fallback: scientific name)
  - Scientific name
  - Provider badge (iNaturalist or eBird)
  - Observed date/time
  - Location (rounded lat/lng)
  - Photo (if available)
  - External link to source record
  - Small reference section (taxon info)

### UX / Performance
- Fetch observations based on map viewport
- Debounce map movement
- Cluster or cap markers at low zoom
- Lightweight caching (memory only)

---

## API Strategy

### Viewport-driven fetching
1. Convert map viewport → bounding box
2. Derive center point + approximate radius
3. Query providers in parallel
4. Normalize responses into shared model
5. Deduplicate

---

## eBird Integration

Base URL:
```
https://api.ebird.org/v2
```

Primary endpoint:
```
GET /data/obs/geo/recent
```

Params:
- `lat`
- `lng`
- `dist` (km, max 50)
- `back` (days, 1–30)
- `maxResults`

Auth:
- Send API key in header: `x-ebirdapitoken`

Viewport handling:
- eBird uses **center + radius**, not bounding box
- If viewport radius > 50km:
  - Tile viewport (2×2 or 3×3 centers)
  - Merge + dedupe results

---

## iNaturalist Integration

Base URL:
```
https://api.inaturalist.org/v1
```

Primary endpoint:
```
GET /observations
```

Strategy:
- Prefer bounding box query if available
- Fallback to center + radius approximation
- Filter to:
  - georeferenced observations
  - recent window (7–14 days)
  - observations with photos

Implement param builder so fields are easy to tweak.

---

## Normalized Data Model

```ts
type Provider = "inat" | "ebird";

type Observation = {
  id: string;                 // provider + providerId
  provider: Provider;

  lat: number;
  lng: number;

  observedAt?: string;        // ISO
  placeGuess?: string;

  commonName?: string;
  scientificName?: string;

  taxaBucket:
    | "Bird"
    | "Mammal"
    | "Reptile"
    | "Amphibian"
    | "Fish"
    | "Insect"
    | "Arachnid"
    | "Mollusk"
    | "Plant"
    | "Fungi"
    | "Other";

  photoUrl?: string;
  detailUrl?: string;

  raw: any;
};
```

---

## Taxa Bucketing & Colors

Rules:
- eBird → always `Bird`
- iNaturalist → map `iconic_taxon_name` to bucket

Buckets → deterministic color palette
- Keep under ~12 colors
- Circles with optional subtle stroke

---

## Reference Info

MVP approach:
- iNaturalist: use taxon data already in observation payload + link to iNat taxon page
- eBird: link to eBird species page

Optional later:
- Add Wikipedia summary lookup

---

## Architecture

### Client (Expo)
Suggested libraries:
- Map: `react-native-maps`
- Bottom sheet: `@gorhom/bottom-sheet`
- Networking: `fetch`
- State: lightweight (Zustand or React state)

### Optional Server (Vercel)
Recommended even for personal use.

Purpose:
- Hide eBird API key
- Add caching + rate protection

Endpoint:
```
GET /api/ebird/recent?lat=&lng=&dist=&back=
```

Server injects `x-ebirdapitoken` header.

---

## Map Fetch Algorithm

1. On map region change → debounce (500–800ms)
2. Compute viewport bbox + center + radius
3. Fetch:
   - eBird (center + radius, tiled if needed)
   - iNaturalist (bbox or radius)
4. Normalize → `Observation[]`
5. Dedupe:
   - provider + providerId
   - optional spatial dedupe (~30m + same species)
6. Render markers (cluster if zoomed out)

---

## UI Notes

- Default region: SF Bay Area
- Marker tap:
  - highlight marker
  - open bottom sheet at ~40%
- Sheet sections:
  - Hero image
  - Names + taxon + provider badge
  - Observed time
  - External link
  - Optional debug/raw toggle

---

## Cursor Task Breakdown

### Phase 0: Setup
- Expo app (TypeScript)
- Install maps, bottom sheet, gesture handler, reanimated
- Map screen + bottom sheet scaffold

### Phase 1: Providers
- `providers/ebird.ts`
  - `fetchRecentEbird({ center, radiusKm, backDays })`
  - tiling + dedupe support
- `providers/inat.ts`
  - `fetchInat({ bbox, recentDays })`
- `normalize.ts`

### Phase 2: Map Integration
- Debounced viewport fetching
- Marker rendering
- Bottom sheet detail view

### Phase 3: Server (optional)
- Vercel endpoint for eBird
- Client switches to proxy

### Phase 4: Polish
- Color legend
- Loading + error states
- In-memory caching

---

## Acceptance Criteria

- Panning/zooming updates observations
- Dots render with clear taxonomic color coding
- Tapping a dot shows a rich bottom sheet
- eBird requests respect 50km radius limit
- iNaturalist integration is resilient to param tweaks

