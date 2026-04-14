import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { ErrorCategory, logger } from '@/utils/logger';

type SyncKvStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

let mmkvInstance: SyncKvStorage | null | undefined;

function getMMKVInstance(): SyncKvStorage | null {
  if (mmkvInstance !== undefined) {
    return mmkvInstance;
  }

  try {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkvInstance = createMMKV({ id: 'momir-storage' });
  } catch (error) {
    mmkvInstance = null;
    logger.error(
      ErrorCategory.Storage,
      'MMKV unavailable at runtime, falling back to AsyncStorage persistence',
      error
    );
  }

  return mmkvInstance;
}

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
    getMMKVInstance()?.remove(storageKey);
    return false;
  }
}

export const MMKVStorage: StateStorage = {
  async getItem(name) {
    const mmkv = getMMKVInstance();

    if (!mmkv) {
      return AsyncStorage.getItem(name);
    }

    const value = mmkv.getString(name);

    if (value === undefined) {
      return null;
    }

    if (!isValidPersistedJson(name, value)) {
      return null;
    }

    return value;
  },
  async setItem(name, value) {
    const mmkv = getMMKVInstance();

    if (!mmkv) {
      await AsyncStorage.setItem(name, value);
      return;
    }

    mmkv.set(name, value);
  },
  async removeItem(name) {
    const mmkv = getMMKVInstance();

    if (!mmkv) {
      await AsyncStorage.removeItem(name);
      return;
    }

    mmkv.remove(name);
  },
};
