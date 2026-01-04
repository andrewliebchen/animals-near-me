import { supabase } from '../utils/supabase';
import { getDeviceId } from '../utils/deviceId';

/**
 * Mark an observation as seen
 */
export async function markObservationAsSeen(observationId: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping mark as seen');
    return;
  }

  try {
    const deviceId = await getDeviceId();
    
    await supabase
      .from('seen_observations')
      .upsert({
        device_id: deviceId,
        observation_id: observationId,
        seen_at: new Date().toISOString(),
      }, {
        onConflict: 'device_id,observation_id',
      });
  } catch (error) {
    console.error('Error marking observation as seen:', error);
    // Don't throw - we don't want this to break the app
  }
}

/**
 * Get set of seen observation IDs for current device
 */
export async function getSeenObservationIds(): Promise<Set<string>> {
  if (!supabase) {
    return new Set();
  }

  try {
    const deviceId = await getDeviceId();
    
    const { data, error } = await supabase
      .from('seen_observations')
      .select('observation_id')
      .eq('device_id', deviceId);

    if (error) {
      console.error('Error fetching seen observations:', error);
      return new Set();
    }

    return new Set(data?.map(row => row.observation_id) || []);
  } catch (error) {
    console.error('Error getting seen observations:', error);
    return new Set();
  }
}

/**
 * Batch mark multiple observations as seen
 */
export async function markObservationsAsSeen(observationIds: string[]): Promise<void> {
  if (!supabase || observationIds.length === 0) {
    return;
  }

  try {
    const deviceId = await getDeviceId();
    const now = new Date().toISOString();
    
    const records = observationIds.map(observationId => ({
      device_id: deviceId,
      observation_id: observationId,
      seen_at: now,
    }));

    await supabase
      .from('seen_observations')
      .upsert(records, {
        onConflict: 'device_id,observation_id',
      });
  } catch (error) {
    console.error('Error batch marking observations as seen:', error);
  }
}

/**
 * Clear all seen observations for current device (optional utility)
 */
export async function clearSeenObservations(): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const deviceId = await getDeviceId();
    
    await supabase
      .from('seen_observations')
      .delete()
      .eq('device_id', deviceId);
  } catch (error) {
    console.error('Error clearing seen observations:', error);
    throw error;
  }
}

