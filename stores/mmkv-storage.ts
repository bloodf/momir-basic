import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { ErrorCategory, logger } from '@/utils/logger';

type SyncKvStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

function createMMKVInstance(): SyncKvStorage | null {
  try {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    return createMMKV({ id: 'momir-storage' });
  } catch (error) {
    logger.error(
      ErrorCategory.Storage,
      'MMKV unavailable at runtime, falling back to AsyncStorage persistence',
      error
    );
    return null;
  }
}

/** Shared MMKV instance, or null when the native module is unavailable (e.g. web). */
export const mmkvInstance = createMMKVInstance();

function isValidPersistedJson(storageKey: string, value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch (error) {
    logger.error(
      ErrorCategory.Storage,
      `Corrupted data in MMKV key "${storageKey}", clearing and using defaults`,
      error
    );
    mmkvInstance?.remove(storageKey);
    return false;
  }
}

/**
 * Zustand persist storage backed by MMKV.
 *
 * MMKV paths are deliberately synchronous: zustand's persist middleware hydrates
 * during create() when getItem returns a value instead of a Promise, so stores
 * never expose defaults on first render and early writes can't clobber saved data.
 * Only the AsyncStorage fallback is async.
 */
export const MMKVStorage: StateStorage = {
  getItem(name) {
    if (!mmkvInstance) {
      return AsyncStorage.getItem(name);
    }

    const value = mmkvInstance.getString(name);

    if (value === undefined) {
      return null;
    }

    if (!isValidPersistedJson(name, value)) {
      return null;
    }

    return value;
  },
  setItem(name, value) {
    if (!mmkvInstance) {
      return AsyncStorage.setItem(name, value);
    }

    mmkvInstance.set(name, value);
  },
  removeItem(name) {
    if (!mmkvInstance) {
      return AsyncStorage.removeItem(name);
    }

    mmkvInstance.remove(name);
  },
};
