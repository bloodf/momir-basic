import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  AppSettings,
  PrinterPreferences,
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

  return useMemo(() => ({
    settings,
    updateSettings,
    updatePrinter,
    isLoading: settingsQuery.isLoading,
  }), [settings, updateSettings, updatePrinter, settingsQuery.isLoading]);
});
