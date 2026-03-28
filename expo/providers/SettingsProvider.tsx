import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { AppSettings, PrinterConfig } from '@/types';

const SETTINGS_KEY = 'momir_settings';

const DEFAULT_PRINTER: PrinterConfig = {
  name: '',
  address: '',
  type: 'ble',
  paperWidth: 58,
  printArt: true,
  autoPrint: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  printer: DEFAULT_PRINTER,
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
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } as AppSettings : DEFAULT_SETTINGS;
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

  const updatePrinter = useCallback((partial: Partial<PrinterConfig>) => {
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
