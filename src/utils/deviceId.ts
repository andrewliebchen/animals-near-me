import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'animals-near-me-device-id';

/**
 * Get or create a unique device ID
 * Uses installationId from expo-constants if available, otherwise generates and stores one
 */
export async function getDeviceId(): Promise<string> {
  // First try to get stored device ID
  try {
    const storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (storedId) {
      return storedId;
    }
  } catch (error) {
    // If SecureStore fails, continue to fallback options
    console.warn('Failed to read device ID from SecureStore:', error);
  }

  // Try to use expo installation ID (unique per app installation)
  if (Constants.installationId) {
    try {
      await SecureStore.setItemAsync(DEVICE_ID_KEY, Constants.installationId);
      return Constants.installationId;
    } catch (error) {
      // If we can't store it, still return the installationId
      console.warn('Failed to store device ID in SecureStore:', error);
      return Constants.installationId;
    }
  }

  // Fallback: generate a UUID-like ID and store it
  // This is a simple UUID v4 implementation
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const generatedId = generateUUID();
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generatedId);
  } catch (error) {
    // If we can't store it, still return the generated ID
    console.warn('Failed to store generated device ID in SecureStore:', error);
  }
  return generatedId;
}

