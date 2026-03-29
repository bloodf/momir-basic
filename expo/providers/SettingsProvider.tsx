import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import {
  AppSettings,
  PrinterPreferences,
  PrinterRecord,
  LegacyPrinterConfig,
  migratePrinterPreferences,
  DEFAULT_PRINTER_PREFERENCES,
} from '@/types';

const SETTINGS_KEY = 'momir_settings';

const DEFAULT_SETTINGS: AppSettings = {
  printer: DEFAULT_PRINTER_PREFERENCES,
  excludeDigitalOnly: true,
  excludeFunnySets: true,
  uniqueCardsOnly: false,
  printerConnected: false,
  devMode: false,
};

async function savePreferredPrinterToRegistry(deviceId: string): Promise<void> {
  const { registryService } = await import('../services/printer/registry/service');
  return registryService.savePreferredPrinter(deviceId);
}

async function getPreferredPrinterFromRegistry(): Promise<PrinterRecord | null> {
  const { registryService } = await import('../services/printer/registry/service');
  return registryService.getPreferredPrinter();
}

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const merged = { ...DEFAULT_SETTINGS, ...parsed };

      if (parsed.printer && typeof parsed.printer === 'object') {
        const printer = parsed.printer as Record<string, unknown>;
        if ('address' in printer && !('preferredPrinterId' in printer)) {
          const legacyConfig: LegacyPrinterConfig = {
            name: typeof printer.name === 'string' ? printer.name : '',
            address: typeof printer.address === 'string' ? printer.address : '',
            type: printer.type === 'classic' || printer.type === 'ble' ? printer.type : 'ble',
            paperWidth: printer.paperWidth === 58 || printer.paperWidth === 80 ? printer.paperWidth : 58,
            printArt: typeof printer.printArt === 'boolean' ? printer.printArt : true,
            autoPrint: typeof printer.autoPrint === 'boolean' ? printer.autoPrint : false,
          };
          merged.printer = migratePrinterPreferences(legacyConfig);
        }
      }

      return merged as AppSettings;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    let lastState = AppState.currentState;
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (lastState.match(/inactive|background/) && nextAppState === 'active') {
        if (settings.printer.preferredPrinterId && settings.printerConnected) {
          const { processQueue } = await import('../services/printer/queue/engine');
          void processQueue();
        }
      }
      lastState = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [settings.printer.preferredPrinterId, settings.printerConnected]);

  const saveMutation = useMutation({
    mutationFn: async (updated: AppSettings) => {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const updatePrinter = useCallback((partial: Partial<PrinterPreferences>) => {
    setSettings(prev => {
      const updated = { ...prev, printer: { ...prev.printer, ...partial } };
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const savePreferredPrinter = useCallback(async (deviceId: string) => {
    await updatePrinter({ preferredPrinterId: deviceId });
    await savePreferredPrinterToRegistry(deviceId);
  }, [updatePrinter]);

  const getPreferredPrinter = useCallback(async (): Promise<PrinterRecord | null> => {
    return getPreferredPrinterFromRegistry();
  }, []);

  return useMemo(() => ({
    settings,
    updateSettings,
    updatePrinter,
    savePreferredPrinter,
    getPreferredPrinter,
    isLoading: settingsQuery.isLoading,
  }), [settings, updateSettings, updatePrinter, savePreferredPrinter, getPreferredPrinter, settingsQuery.isLoading]);
});

export async function getPrinterPreferencesFromSettings(): Promise<PrinterPreferences> {
  const stored = await AsyncStorage.getItem(SETTINGS_KEY);
  const parsed = stored ? JSON.parse(stored) : {};
  return (parsed.printer as PrinterPreferences) ?? DEFAULT_PRINTER_PREFERENCES;
}

export async function savePrinterPreferencesToSettings(prefs: Partial<PrinterPreferences>): Promise<void> {
  const stored = await AsyncStorage.getItem(SETTINGS_KEY);
  const parsed = stored ? JSON.parse(stored) : {};
  const updated = {
    ...parsed,
    printer: { ...(parsed.printer || DEFAULT_PRINTER_PREFERENCES), ...prefs },
  };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
}
