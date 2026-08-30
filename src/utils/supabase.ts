import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and/or anon key not configured. Filter storage and seen observations tracking will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface SeenObservation {
  id: string;
  device_id: string;
  observation_id: string;
  seen_at: string;
}

export interface UserPreferences {
  device_id: string;
  filters: any; // JSONB type - will be FilterParams
  updated_at: string;
}




