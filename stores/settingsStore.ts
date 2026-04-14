import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppSettings, PrinterPreferences, PrinterRecord } from '@/types';
import { DEFAULT_PRINTER_PREFERENCES } from '@/types';

import { MMKVStorage } from './mmkv-storage';

export const SETTINGS_KEY = 'momir_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  printer: DEFAULT_PRINTER_PREFERENCES,
  excludeDigitalOnly: true,
  excludeFunnySets: true,
  uniqueCardsOnly: false,
  printerConnected: false,
  devMode: false,
};

type SettingsState = {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updatePrinter: (partial: Partial<PrinterPreferences>) => void;
  savePreferredPrinter: (deviceId: string) => Promise<void>;
  getPreferredPrinter: () => Promise<PrinterRecord | null>;
};

async function getPrinterRecordById(deviceId: string): Promise<PrinterRecord | null> {
  const { getPrinterById } = require('@/services/printer/storage/repositories') as typeof import('@/services/printer/storage/repositories');
  return getPrinterById(deviceId);
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...partial,
          },
        })),
      updatePrinter: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            printer: {
              ...state.settings.printer,
              ...partial,
            },
          },
        })),
      savePreferredPrinter: async (deviceId) => {
        const printer = await getPrinterRecordById(deviceId);

        if (!printer) {
          throw new Error(`Printer with id ${deviceId} not found in registry`);
        }

        get().updatePrinter({ preferredPrinterId: deviceId });
      },
      getPreferredPrinter: async () => {
        const preferredPrinterId = get().settings.printer.preferredPrinterId;

        if (!preferredPrinterId) {
          return null;
        }

        return getPrinterRecordById(preferredPrinterId);
      },
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => MMKVStorage),
      partialize: (state) => ({
        settings: state.settings,
      }),
    },
  ),
);
