import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorCategory, logger } from '@/utils/logger';

/**
 * Safely parse a JSON string from AsyncStorage with automatic corruption recovery.
 *
 * If the stored value is null, empty, or contains corrupted JSON:
 * 1. Logs a structured error via the logger
 * 2. Clears the corrupted key from AsyncStorage (fire-and-forget)
 * 3. Returns the provided fallback value
 *
 * @param json - Raw string from AsyncStorage.getItem, or null
 * @param fallback - Default value returned on null/empty/corrupt input
 * @param storageKey - AsyncStorage key name (used in log messages and for removal)
 * @returns Parsed value of type T, or fallback
 */
export function safeJsonParse<T>(
  json: string | null,
  fallback: T,
  storageKey: string,
): T {
  if (json === null || json === '') {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(
      ErrorCategory.Storage,
      `Corrupted data in AsyncStorage key "${storageKey}", clearing and using defaults`,
      error,
    );
    void AsyncStorage.removeItem(storageKey);
    return fallback;
  }
}