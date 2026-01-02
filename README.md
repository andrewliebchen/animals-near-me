# Animals Near Me

An Expo iOS app that displays nearby wildlife observations from iNaturalist and eBird on an interactive map.

## Features

- **Map-first interface**: Pan and zoom to see wildlife observations worldwide
- **Dual data sources**: Combines observations from iNaturalist and eBird
- **Color-coded markers**: Observations are color-coded by taxonomic category
- **Detail view**: Tap any marker to see detailed information in a bottom sheet
- **Server-side aggregation**: All data fetching, normalization, and deduplication happens on the server

## Architecture

- **Client**: Expo React Native app with TypeScript
- **Server**: Vercel serverless functions
- **Data Sources**: 
  - iNaturalist API (all taxa)
  - eBird API (birds only)

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- eBird API key ([get one here](https://ebird.org/api/keygen))
- Vercel account (for server deployment)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:

Create a `.env` file:
```
EXPO_PUBLIC_API_URL=https://your-app.vercel.app/api
```

For the Vercel server, set the environment variable:
- `EBIRD_API_KEY`: Your eBird API key

### Running Locally

#### Client (Expo)
```bash
npm start
```

Then press `i` for iOS simulator or scan the QR code with Expo Go.

#### Server (Vercel)

Deploy to Vercel:
```bash
vercel
```

Or run locally with Vercel CLI:
```bash
vercel dev
```

Make sure to set `EXPO_PUBLIC_API_URL` to your local server URL (e.g., `http://localhost:3000/api`) when developing locally.

## Project Structure

```
/
  api/
    observations/
      index.ts          # Main server endpoint
  server/
    providers/
      ebird.ts         # eBird API client
      inat.ts          # iNaturalist API client
      normalize.ts     # Data normalization
    utils/
      viewport.ts      # Viewport calculations
      dedupe.ts        # Deduplication logic
      cache.ts         # Server-side caching
  src/
    types/
      observation.ts   # Shared TypeScript types
    components/
      MapScreen.tsx    # Main map component
      ObservationMarker.tsx
      ObservationSheet.tsx
      LoadingState.tsx
      ErrorState.tsx
      ColorLegend.tsx
    store/
      observationStore.ts  # Zustand store
    api/
      client.ts        # Server API client
    utils/
      viewport.ts       # Client viewport utils
      colors.ts         # Taxa color mapping
  app/
    _layout.tsx        # Expo Router layout
    index.tsx          # App entry point
```

## API Endpoint

### GET /api/observations

Fetches observations for a given viewport.

**Query Parameters:**
- `lat` (number): Center latitude
- `lng` (number): Center longitude
- `latDelta` (number): Latitude delta (viewport height)
- `lngDelta` (number): Longitude delta (viewport width)

**Response:**
```json
{
  "observations": [
    {
      "id": "ebird-12345",
      "provider": "ebird",
      "lat": 37.7749,
      "lng": -122.4194,
      "observedAt": "2024-01-15T10:30:00Z",
      "commonName": "American Robin",
      "scientificName": "Turdus migratorius",
      "taxaBucket": "Bird",
      "photoUrl": "https://...",
      "detailUrl": "https://ebird.org/..."
    }
  ]
}
```

## Development

### Key Features

- **Debounced fetching**: Map movements are debounced (600ms) to reduce API calls
- **Server-side caching**: Observations are cached for 5 minutes
- **Tiling**: Large viewports are automatically tiled for eBird (respects 50km radius limit)
- **Deduplication**: Observations are deduplicated by ID and spatial proximity (~30m)

### Taxa Color Palette

- Bird: Blue
- Mammal: Brown
- Reptile: Green
- Amphibian: Teal
- Fish: Cyan
- Insect: Yellow
- Arachnid: Orange
- Mollusk: Purple
- Plant: Dark Green
- Fungi: Pink
- Other: Gray

## Deployment

### Server (Vercel)

Deploy:
```bash
vercel --prod
```

Make sure to set the `EBIRD_API_KEY` environment variable in Vercel dashboard.

### Client (Expo) - TestFlight Build

#### Prerequisites

1. **EAS CLI**: Install globally if not already installed:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**: 
   ```bash
   eas login
   ```

3. **Configure Production API URL**: Update `eas.json` with your Vercel deployment URL. In the `preview` and `production` build profiles, update the `EXPO_PUBLIC_API_URL` environment variable:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "https://your-app.vercel.app/api"
   }
   ```
   Replace `https://your-app.vercel.app` with your actual Vercel deployment URL.

   **Note**: For local development, create a `.env` file with `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

#### Building for TestFlight

Use the preview profile to build for TestFlight:
```bash
npm run eas:build:ios:preview
```

Or use EAS CLI directly:
```bash
eas build --platform ios --profile preview
```

#### Submitting to TestFlight

After the build completes, you can submit it to App Store Connect:
```bash
npm run eas:submit:ios
```

Or use EAS CLI directly:
```bash
eas submit --platform ios
```

**Note**: Make sure you've configured your Apple ID and App Store Connect credentials in `eas.json` before submitting, or EAS will prompt you during submission.

#### Build Profiles

- `development`: For development client builds (simulator)
- `preview`: For TestFlight builds (internal distribution)
- `production`: For App Store releases (store distribution)

## License

Personal use MVP - see brief for details.

