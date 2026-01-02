# Running Locally

## Prerequisites

1. **Node.js 18+** installed
2. **eBird API Key** - Get one at https://ebird.org/api/keygen
3. **Vercel CLI** installed globally:
   ```bash
   npm install -g vercel
   ```

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Start the Server (Terminal 1)

The server needs your eBird API key. You have two options:

**Option A: Set in `.env.local` (recommended for local dev)**
```bash
# Create .env.local (this file is gitignored)
echo "EBIRD_API_KEY=your_ebird_api_key_here" > .env.local
```

Then run:
```bash
vercel dev
```

**Option B: Pass as environment variable**
```bash
EBIRD_API_KEY=your_ebird_api_key_here vercel dev
```

The server will start at `http://localhost:3000`

### 4. Start the Client (Terminal 2)

In a new terminal:

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code you can scan with Expo Go (iOS/Android)
- Or press `i` for iOS simulator / `a` for Android emulator

## Quick Start (All in One)

If you want to run both at once, you can use two terminals:

**Terminal 1 (Server):**
```bash
EBIRD_API_KEY=your_key vercel dev
```

**Terminal 2 (Client):**
```bash
npm start
```

## Troubleshooting

### Server won't start
- Make sure you have Vercel CLI installed: `npm install -g vercel`
- Check that `EBIRD_API_KEY` is set correctly
- Try running `vercel login` first

### Client can't connect to server
- Make sure the server is running on port 3000
- Check that `EXPO_PUBLIC_API_URL` in `.env` is `http://localhost:3000/api`
- Restart the Expo server after changing `.env`

### No observations showing
- Check server logs for API errors
- Verify your eBird API key is valid
- Make sure you're viewing a region with recent observations (try SF Bay Area)

## Testing the API Directly

You can test the server endpoint directly:

```bash
curl "http://localhost:3000/api/observations?lat=37.7749&lng=-122.4194&latDelta=0.5&lngDelta=0.5"
```

This should return JSON with observations array.



