import type { PrinterRecord } from '@/types';

jest.mock('@/services/printer/storage/repositories', () => ({
  getPrinterById: jest.fn(),
}));

describe('useSettingsStore', () => {
  const loadMMKVMock = () => require('react-native-mmkv') as {
    __resetMMKVMock: () => void;
  };
  const loadSettingsStoreModule = () => require('@/stores/settingsStore') as typeof import('@/stores/settingsStore');
  const loadRepositoryModule = () =>
    require('@/services/printer/storage/repositories') as {
      getPrinterById: jest.MockedFunction<(id: string) => Promise<PrinterRecord | null>>;
    };

  beforeEach(() => {
    jest.resetModules();
    loadMMKVMock().__resetMMKVMock();
    jest.clearAllMocks();
  });

  it('hydrates synchronously with defaults on first load', () => {
    const { useSettingsStore, DEFAULT_SETTINGS } = loadSettingsStoreModule();

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('updates top-level settings fields', () => {
    const { useSettingsStore } = loadSettingsStoreModule();

    useSettingsStore.getState().updateSettings({
      uniqueCardsOnly: true,
      excludeFunnySets: false,
    });

    expect(useSettingsStore.getState().settings.uniqueCardsOnly).toBe(true);
    expect(useSettingsStore.getState().settings.excludeFunnySets).toBe(false);
  });

  it('updates nested printer preferences without losing existing values', () => {
    const { useSettingsStore, DEFAULT_SETTINGS } = loadSettingsStoreModule();

    useSettingsStore.getState().updatePrinter({
      preferredPrinterId: 'printer-1',
      paperWidth: 80,
    });

    expect(useSettingsStore.getState().settings.printer).toEqual({
      ...DEFAULT_SETTINGS.printer,
      preferredPrinterId: 'printer-1',
      paperWidth: 80,
    });
  });

  it('persists settings across store recreation', () => {
    const first = loadSettingsStoreModule();
    first.useSettingsStore.getState().updateSettings({ devMode: true });

    jest.resetModules();
    const second = loadSettingsStoreModule();

    expect(second.useSettingsStore.getState().settings.devMode).toBe(true);
  });

  it('saves and loads the preferred printer via repository lookup', async () => {
    const printer: PrinterRecord = {
      id: 'printer-1',
      name: 'Thermal Printer',
      address: 'AA:BB:CC',
      transport: 'ble',
      capabilities: {
        supportImage: true,
        supportQR: true,
        supportCut: true,
        supportText: true,
        paperWidth: 58,
      },
      lastSeenAt: '2026-04-13T00:00:00.000Z',
      createdAt: '2026-04-13T00:00:00.000Z',
    };
    const repositories = loadRepositoryModule();
    repositories.getPrinterById.mockResolvedValue(printer);
    const { useSettingsStore } = loadSettingsStoreModule();

    await useSettingsStore.getState().savePreferredPrinter('printer-1');
    const preferred = await useSettingsStore.getState().getPreferredPrinter();

    expect(useSettingsStore.getState().settings.printer.preferredPrinterId).toBe('printer-1');
    expect(repositories.getPrinterById).toHaveBeenCalledWith('printer-1');
    expect(preferred).toEqual(printer);
  });
});
