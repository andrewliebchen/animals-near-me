# Quick Start Guide

## Current Status
✅ App is running in simulator!
⚠️ Network errors = Server not running yet

## To Fix Network Errors:

### Step 1: Start the Server (New Terminal)

Open a **new terminal** and run:

```bash
cd /Users/liebchen/Code/animals-near-me

# Option A: With environment variable
EBIRD_API_KEY=your_ebird_api_key_here vercel dev

# Option B: Create .env.local file first
echo "EBIRD_API_KEY=your_ebird_api_key_here" > .env.local
vercel dev
```

The server will start at `http://localhost:3000` (or `http://192.168.86.237:3000`)

### Step 2: Verify Server is Running

Test the API in a browser or with curl:
```bash
curl "http://localhost:3000/api/observations?lat=37.7749&lng=-122.4194&latDelta=0.5&lngDelta=0.5"
```

You should get JSON back with observations.

### Step 3: Reload the App

In your Expo terminal, press `r` to reload the app, or shake the simulator and select "Reload".

## iOS Simulator Network Note

The `.env` file is configured to use your local IP (`192.168.86.237`) because iOS simulator sometimes has issues with `localhost`. 

If you prefer `localhost`, you can change it in `.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Need an eBird API Key?

Get one at: https://ebird.org/api/keygen

## Troubleshooting

**Still getting network errors?**
1. Make sure server is running (check Terminal 2)
2. Check server logs for errors
3. Try changing `.env` to use `localhost` instead of IP
4. Make sure `EBIRD_API_KEY` is set correctly

