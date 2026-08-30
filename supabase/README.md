# Supabase Setup Guide

This guide will help you set up Supabase for storing filter preferences and tracking seen observations.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: animals-near-me (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

4. Wait for the project to be created (usually 1-2 minutes)

### 2. Run the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the contents of `schema.sql` and paste it into the editor
4. Click "Run" (or press Cmd+Enter / Ctrl+Enter)
5. You should see "Success. No rows returned" - this means the tables were created successfully

### 3. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL** (under "Project URL")
   - **anon public key** (under "Project API keys" → "anon public")

### 4. Configure Environment Variables

Add these to your `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Important Notes:**
- These are public keys, so it's safe to include them in your code
- The `EXPO_PUBLIC_` prefix makes them available in your Expo app
- The anon key uses Row Level Security (RLS) policies to restrict access - users can only access their own data via device_id

### 5. Verify Setup

After setting up the environment variables, restart your Expo app. The app will:
- Load filters from Supabase on startup
- Save filter changes to Supabase
- Track seen observations in Supabase

If Supabase is not configured, the app will gracefully fall back to default filters and skip seen observations tracking (you'll see a warning in the console).

## Database Schema Overview

### `user_preferences` Table
- Stores filter preferences per device
- **device_id** (TEXT, PRIMARY KEY): Unique device identifier
- **filters** (JSONB): Filter preferences (recency, hasPhoto, taxa, provider, showNewOnly)
- **updated_at** (TIMESTAMPTZ): Last update timestamp

### `seen_observations` Table
- Tracks which observations each device has seen
- **id** (UUID, PRIMARY KEY): Unique record ID
- **device_id** (TEXT): Device identifier
- **observation_id** (TEXT): Observation ID (provider + providerId)
- **seen_at** (TIMESTAMPTZ): When the observation was seen
- **UNIQUE(device_id, observation_id)**: Prevents duplicate entries

## Row Level Security (RLS)

Both tables use RLS policies that allow anonymous access. This means:
- No authentication is required
- Users are identified by their device_id (generated from expo-constants installationId)
- Each device can only see/modify their own data (enforced by device_id filtering in the app code)
- The anon key has limited permissions via RLS policies

## Troubleshooting

### Tables not created?
- Make sure you're running the SQL in the SQL Editor (not the Table Editor)
- Check for any error messages in the SQL Editor output
- Try running each CREATE TABLE statement separately

### App can't connect to Supabase?
- Verify your environment variables are set correctly
- Make sure the `EXPO_PUBLIC_` prefix is included
- Restart your Expo development server after changing .env
- Check the console for Supabase connection errors

### Filters not persisting?
- Check that the `user_preferences` table was created
- Verify your Supabase URL and anon key are correct
- Check the browser/Expo console for error messages
- Make sure RLS policies were created successfully

### Seen observations not tracking?
- Check that the `seen_observations` table was created
- Verify the index was created (`idx_seen_observations_device_observation`)
- Check the browser/Expo console for error messages

## Optional: Viewing Data in Supabase

You can view the data in your Supabase dashboard:
- Go to **Table Editor** to see the tables
- Go to **SQL Editor** to run custom queries

Example query to see filter preferences:
```sql
SELECT device_id, filters, updated_at 
FROM user_preferences 
ORDER BY updated_at DESC;
```

Example query to see seen observations count per device:
```sql
SELECT device_id, COUNT(*) as seen_count
FROM seen_observations
GROUP BY device_id
ORDER BY seen_count DESC;
```




