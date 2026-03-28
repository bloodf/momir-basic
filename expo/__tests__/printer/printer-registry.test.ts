import type { PrinterRecord } from '../../../types';

const fakeBLEPrinter: PrinterRecord = {
  id: 'reg-001',
  name: 'FakeThermal-BLE-001',
  address: 'fake-ble-001',
  transport: 'ble',
  capabilities: {
    supportImage: true,
    supportQR: true,
    supportCut: true,
    supportText: true,
    paperWidth: 58,
  },
  lastSeenAt: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const fakeClassicPrinter: PrinterRecord = {
  id: 'reg-002',
  name: 'FakeThermal-Classic-001',
  address: 'fake-classic-001',
  transport: 'classic',
  capabilities: {
    supportImage: true,
    supportQR: true,
    supportCut: true,
    supportText: true,
    paperWidth: 58,
  },
  lastSeenAt: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const createMockAdapter = () => ({
  discoverPrinters: jest.fn(),
  connectPrinter: jest.fn(),
  disconnectPrinter: jest.fn(),
  isConnected: jest.fn(),
  sendText: jest.fn(),
  sendImage: jest.fn(),
  sendQRCode: jest.fn(),
  cutPaper: jest.fn(),
  getCapabilities: jest.fn(),
});

import { createRegistryService } from 'services/printer/registry/service';

describe('PrinterRegistry', () => {
  it('listPrinters returns all registered printers', async () => {
    const mockListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);
    const service = createRegistryService({ repoListPrinters: mockListPrinters });
    const result = await service.listPrinters();
    expect(result).toEqual([fakeBLEPrinter]);
    expect(mockListPrinters).toHaveBeenCalled();
  });

  it('getPreferredPrinter returns null when no preferred printer is set', async () => {
    const mockGetPreferences = jest.fn().mockResolvedValue({ preferredPrinterId: null });
    const service = createRegistryService({
      repoListPrinters: jest.fn(),
      getPreferences: mockGetPreferences,
    });
    const result = await service.getPreferredPrinter();
    expect(result).toBeNull();
  });

  it('getPreferredPrinter returns the full PrinterRecord when preferred printer is set', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockGetPreferences = jest.fn().mockResolvedValue({ preferredPrinterId: 'reg-001' });
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      getPreferences: mockGetPreferences,
    });
    const result = await service.getPreferredPrinter();
    expect(result).toEqual(fakeBLEPrinter);
    expect(mockGetPrinterById).toHaveBeenCalledWith('reg-001');
  });

  it('savePreferredPrinter stores the registry id in SettingsProvider', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockSavePreferences = jest.fn().mockResolvedValue(undefined);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      savePreferences: mockSavePreferences,
    });
    await service.savePreferredPrinter('reg-001');
    expect(mockSavePreferences).toHaveBeenCalledWith({ preferredPrinterId: 'reg-001' });
  });

  it('savePreferredPrinter throws if printer id not found in registry', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(null);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      savePreferences: jest.fn(),
    });
    await expect(service.savePreferredPrinter('invalid')).rejects.toThrow(
      'Printer with id invalid not found in registry'
    );
  });

  it('forgetPrinter removes printer from registry and clears preferred if matches', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockDeletePrinter = jest.fn().mockResolvedValue(undefined);
    const mockGetPreferences = jest.fn().mockResolvedValue({ preferredPrinterId: 'reg-001' });
    const mockSavePreferences = jest.fn().mockResolvedValue(undefined);
    const mockAdapter = createMockAdapter();
    mockAdapter.disconnectPrinter.mockResolvedValue(undefined);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      repoDeletePrinter: mockDeletePrinter,
      adapterFactory: () => mockAdapter,
      getPreferences: mockGetPreferences,
      savePreferences: mockSavePreferences,
    });
    await service.forgetPrinter('reg-001');
    expect(mockDeletePrinter).toHaveBeenCalledWith('reg-001');
    expect(mockSavePreferences).toHaveBeenCalledWith({ preferredPrinterId: null });
  });

  it('forgetPrinter does not clear preferred if different printer is forgotten', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockDeletePrinter = jest.fn().mockResolvedValue(undefined);
    const mockGetPreferences = jest.fn().mockResolvedValue({ preferredPrinterId: 'reg-other' });
    const mockSavePreferences = jest.fn().mockResolvedValue(undefined);
    const mockAdapter = createMockAdapter();
    mockAdapter.disconnectPrinter.mockResolvedValue(undefined);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      repoDeletePrinter: mockDeletePrinter,
      adapterFactory: () => mockAdapter,
      getPreferences: mockGetPreferences,
      savePreferences: mockSavePreferences,
    });
    await service.forgetPrinter('reg-001');
    expect(mockSavePreferences).not.toHaveBeenCalled();
  });

  it('forgetPrinter is no-op if printer not found in registry', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(null);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
    });
    await service.forgetPrinter('invalid');
    expect(mockGetPrinterById('invalid')).resolves.toBeNull();
  });

  it('connectPrinter connects via adapter using printer address', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockAdapter = createMockAdapter();
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      adapterFactory: () => mockAdapter,
    });
    await service.connectPrinter('reg-001');
    expect(mockAdapter.connectPrinter).toHaveBeenCalledWith('fake-ble-001');
  });

  it('connectPrinter throws if printer not found in registry', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(null);
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
    });
    await expect(service.connectPrinter('invalid')).rejects.toThrow(
      'Printer with id invalid not found in registry'
    );
  });

  it('disconnectPrinter disconnects via adapter', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockAdapter = createMockAdapter();
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      adapterFactory: () => mockAdapter,
    });
    await service.disconnectPrinter('reg-001');
    expect(mockAdapter.disconnectPrinter).toHaveBeenCalledWith('fake-ble-001');
  });

  it('disconnectPrinter is no-op if printer not found', async () => {
    const mockGetPrinterById = jest.fn().mockResolvedValue(null);
    const mockAdapter = createMockAdapter();
    const service = createRegistryService({
      repoGetPrinterById: mockGetPrinterById,
      adapterFactory: () => mockAdapter,
    });
    await service.disconnectPrinter('invalid');
    expect(mockAdapter.disconnectPrinter).not.toHaveBeenCalled();
  });

  it('mergeDiscoveredWithRegistry inserts new printer when address not in registry', async () => {
    const mockGetPrinterByAddress = jest.fn().mockResolvedValue(null);
    const mockUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);
    const service = createRegistryService({
      repoGetPrinterByAddress: mockGetPrinterByAddress,
      repoUpsertPrinter: mockUpsertPrinter,
      repoListPrinters: mockListPrinters,
    });
    const result = await service.mergeDiscoveredWithRegistry([fakeBLEPrinter]);
    expect(mockUpsertPrinter).toHaveBeenCalled();
    expect(result).toEqual([fakeBLEPrinter]);
  });

  it('mergeDiscoveredWithRegistry updates existing printer when address already in registry', async () => {
    const updatedPrinter = { ...fakeBLEPrinter, name: 'Updated Name' };
    const mockGetPrinterByAddress = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockUpsertPrinter = jest.fn().mockResolvedValue(updatedPrinter);
    const mockListPrinters = jest.fn().mockResolvedValue([updatedPrinter]);
    const service = createRegistryService({
      repoGetPrinterByAddress: mockGetPrinterByAddress,
      repoUpsertPrinter: mockUpsertPrinter,
      repoListPrinters: mockListPrinters,
    });
    const result = await service.mergeDiscoveredWithRegistry([
      { ...fakeBLEPrinter, name: 'Updated Name' },
    ]);
    expect(mockUpsertPrinter).toHaveBeenCalledWith({
      id: fakeBLEPrinter.id,
      name: 'Updated Name',
      address: fakeBLEPrinter.address,
      transport: fakeBLEPrinter.transport,
      capabilities: fakeBLEPrinter.capabilities,
    });
    expect(result).toEqual([updatedPrinter]);
  });

  it('mergeDiscoveredWithRegistry no duplicate per address - existing record is updated not inserted', async () => {
    const mockGetPrinterByAddress = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);
    const service = createRegistryService({
      repoGetPrinterByAddress: mockGetPrinterByAddress,
      repoUpsertPrinter: mockUpsertPrinter,
      repoListPrinters: mockListPrinters,
    });
    await service.mergeDiscoveredWithRegistry([fakeBLEPrinter]);
    expect(mockGetPrinterByAddress).toHaveBeenCalledWith(fakeBLEPrinter.address);
    expect(mockUpsertPrinter).toHaveBeenCalledTimes(1);
  });

  it('discoverPrinters discovers printers via adapter and merges into registry', async () => {
    const mockAdapter = createMockAdapter();
    mockAdapter.discoverPrinters.mockResolvedValue([fakeBLEPrinter, fakeClassicPrinter]);
    const mockGetPrinterByAddress = jest.fn().mockResolvedValue(null);
    const mockUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
    const mockListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);
    const service = createRegistryService({
      adapterFactory: () => mockAdapter,
      repoGetPrinterByAddress: mockGetPrinterByAddress,
      repoUpsertPrinter: mockUpsertPrinter,
      repoListPrinters: mockListPrinters,
    });
    const result = await service.discoverPrinters();
    expect(mockListPrinters).toHaveBeenCalled();
    expect(result).toEqual([fakeBLEPrinter]);
  });
});
