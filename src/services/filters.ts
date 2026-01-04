import { supabase } from '../utils/supabase';
import { getDeviceId } from '../utils/deviceId';
import type { FilterParams } from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';

/**
 * Load filters from Supabase for current device
 */
export async function loadFilters(): Promise<FilterParams> {
  if (!supabase) {
    console.warn('Supabase not configured, returning default filters');
    return DEFAULT_FILTERS;
  }

  try {
    const deviceId = await getDeviceId();
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('filters')
      .eq('device_id', deviceId)
      .single();

    if (error) {
      // If no row found, that's fine - return defaults
      if (error.code === 'PGRST116') {
        return DEFAULT_FILTERS;
      }
      console.error('Error loading filters from Supabase:', error);
      return DEFAULT_FILTERS;
    }

    // Validate that filters exist and have the right structure
    if (data && data.filters) {
      // Return the filters from DB, with defaults as fallback for missing fields
      return {
        ...DEFAULT_FILTERS,
        ...data.filters,
      };
    }

    return DEFAULT_FILTERS;
  } catch (error) {
    console.error('Error loading filters:', error);
    return DEFAULT_FILTERS;
  }
}

/**
 * Save filters to Supabase
 */
export async function saveFilters(filters: FilterParams): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping save filters');
    return;
  }

  try {
    const deviceId = await getDeviceId();
    
    await supabase
      .from('user_preferences')
      .upsert({
        device_id: deviceId,
        filters: filters,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'device_id',
      });
  } catch (error) {
    console.error('Error saving filters:', error);
    // Don't throw - we don't want this to break the app
  }
}

