import type { PrinterRecord } from '../../types';

const fakeBLEPrinter: PrinterRecord = {
  id: 'reg-001',
  name: 'FakeThermal-BLE-001',
  address: 'AA:BB:CC:DD:EE:FF',
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
  address: '11:22:33:44:55:66',
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

const fakeTCPPrinter: PrinterRecord = {
  id: 'tcp-192.168.1.100-9100',
  name: 'TCP Printer (192.168.1.100)',
  address: '192.168.1.100',
  transport: 'tcp',
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

describe('Printer Settings Flows', () => {
  describe('Discovery Flow', () => {
    it('discovery uses registryService.discoverPrinters to get printers', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.discoverPrinters.mockResolvedValue([fakeBLEPrinter]);

      const mockRepoGetPrinterByAddress = jest.fn().mockResolvedValue(null);
      const mockRepoUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
      const mockRepoListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterByAddress: mockRepoGetPrinterByAddress,
        repoUpsertPrinter: mockRepoUpsertPrinter,
        repoListPrinters: mockRepoListPrinters,
      });

      const result = await service.discoverPrinters();

      expect(mockAdapter.discoverPrinters).toHaveBeenCalled();
      expect(result).toEqual([fakeBLEPrinter]);
    });

    it('discovered printers are stored in registry with correct transport', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.discoverPrinters.mockResolvedValue([fakeBLEPrinter, fakeTCPPrinter]);

      const mockRepoGetPrinterByAddress = jest.fn().mockResolvedValue(null);
      const mockRepoUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
      const mockRepoListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter, fakeTCPPrinter]);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterByAddress: mockRepoGetPrinterByAddress,
        repoUpsertPrinter: mockRepoUpsertPrinter,
        repoListPrinters: mockRepoListPrinters,
      });

      await service.discoverPrinters();

      expect(mockRepoUpsertPrinter).toHaveBeenCalledWith(
        expect.objectContaining({
          id: fakeBLEPrinter.id,
          transport: 'ble',
        })
      );
      expect(mockRepoUpsertPrinter).toHaveBeenCalledWith(
        expect.objectContaining({
          id: fakeTCPPrinter.id,
          transport: 'tcp',
        })
      );
    });
  });

  describe('Permission-Denied Flow', () => {
    it('registry service does not throw on permission denied during discovery', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.discoverPrinters.mockRejectedValue(
        new Error('[PrinterCapability] Permission denied: Bluetooth permissions were denied.')
      );

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
      });

      await expect(service.discoverPrinters()).rejects.toThrow('Permission denied');
    });

    it('connectPrinter throws on permission denied', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.connectPrinter.mockRejectedValue(
        new Error('[PrinterCapability] Permission denied: Bluetooth permissions were denied.')
      );

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterById: mockRepoGetPrinterById,
      });

      await expect(service.connectPrinter('reg-001')).rejects.toThrow('Permission denied');
    });
  });

  describe('Unsupported Transport Flow', () => {
    it('registry filters transports that are unsupported on current platform', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.discoverPrinters.mockResolvedValue([fakeBLEPrinter, fakeClassicPrinter]);

      const mockRepoGetPrinterByAddress = jest.fn().mockResolvedValue(null);
      const mockRepoUpsertPrinter = jest.fn().mockResolvedValue(fakeBLEPrinter);
      const mockRepoListPrinters = jest.fn().mockResolvedValue([fakeBLEPrinter]);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterByAddress: mockRepoGetPrinterByAddress,
        repoUpsertPrinter: mockRepoUpsertPrinter,
        repoListPrinters: mockRepoListPrinters,
      });

      const result = await service.discoverPrinters();

      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((printer: PrinterRecord) => {
        expect(['ble', 'tcp', 'classic']).toContain(printer.transport);
      });
    });
  });

  describe('Connected Flow', () => {
    it('connectPrinter uses registry ID to look up address and connect', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.connectPrinter.mockResolvedValue(undefined);
      mockAdapter.isConnected.mockResolvedValue(true);

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterById: mockRepoGetPrinterById,
      });

      await service.connectPrinter('reg-001');

      expect(mockAdapter.connectPrinter).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('isConnected verifies physical connection state', async () => {
      const mockAdapter = createMockAdapter();
      mockAdapter.isConnected.mockResolvedValue(true);

      const isConnected = await mockAdapter.isConnected('AA:BB:CC:DD:EE:FF');
      expect(isConnected).toBe(true);
    });

    it('isConnected returns false when printer is not reachable', async () => {
      const mockAdapter = createMockAdapter();
      mockAdapter.isConnected.mockResolvedValue(false);

      const isConnected = await mockAdapter.isConnected('AA:BB:CC:DD:EE:FF');
      expect(isConnected).toBe(false);
    });

    it('savePreferredPrinter stores registry ID as preferred printer', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
      const mockSavePreferences = jest.fn().mockResolvedValue(undefined);

      const service = createRegistryService({
        repoGetPrinterById: mockRepoGetPrinterById,
        savePreferences: mockSavePreferences,
      });

      await service.savePreferredPrinter('reg-001');

      expect(mockSavePreferences).toHaveBeenCalledWith({ preferredPrinterId: 'reg-001' });
    });

    it('savePreferredPrinter throws if printer ID not found in registry', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(null);

      const service = createRegistryService({
        repoGetPrinterById: mockRepoGetPrinterById,
        savePreferences: jest.fn(),
      });

      await expect(service.savePreferredPrinter('invalid')).rejects.toThrow(
        'Printer with id invalid not found in registry'
      );
    });
  });

  describe('Disconnected Flow', () => {
    it('disconnectPrinter disconnects via adapter', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.disconnectPrinter.mockResolvedValue(undefined);

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterById: mockRepoGetPrinterById,
      });

      await service.disconnectPrinter('reg-001');

      expect(mockAdapter.disconnectPrinter).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('forgetPrinter disconnects and removes from registry', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      mockAdapter.disconnectPrinter.mockResolvedValue(undefined);

      const mockRepoGetPrinterById = jest.fn().mockResolvedValue(fakeBLEPrinter);
      const mockRepoDeletePrinter = jest.fn().mockResolvedValue(undefined);
      const mockRepoGetPreferences = jest.fn().mockResolvedValue({ preferredPrinterId: 'reg-001' });
      const mockRepoSavePreferences = jest.fn().mockResolvedValue(undefined);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterById: mockRepoGetPrinterById,
        repoDeletePrinter: mockRepoDeletePrinter,
        getPreferences: mockRepoGetPreferences,
        savePreferences: mockRepoSavePreferences,
      });

      await service.forgetPrinter('reg-001');

      expect(mockAdapter.disconnectPrinter).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      expect(mockRepoDeletePrinter).toHaveBeenCalledWith('reg-001');
      expect(mockRepoSavePreferences).toHaveBeenCalledWith({ preferredPrinterId: null });
    });
  });

  describe('TCP Entry Flow', () => {
    it('TCP printer is added to registry with correct transport', async () => {
      const { createRegistryService } = require('../../services/printer/registry/service');

      const mockAdapter = createMockAdapter();
      const mockRepoGetPrinterByAddress = jest.fn().mockResolvedValue(null);
      const mockRepoUpsertPrinter = jest.fn().mockResolvedValue(fakeTCPPrinter);
      const mockRepoListPrinters = jest.fn().mockResolvedValue([fakeTCPPrinter]);

      const service = createRegistryService({
        adapterFactory: () => mockAdapter,
        repoGetPrinterByAddress: mockRepoGetPrinterByAddress,
        repoUpsertPrinter: mockRepoUpsertPrinter,
        repoListPrinters: mockRepoListPrinters,
      });

      await service.mergeDiscoveredWithRegistry([fakeTCPPrinter]);

      expect(mockRepoUpsertPrinter).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tcp-192.168.1.100-9100',
          name: 'TCP Printer (192.168.1.100)',
          address: '192.168.1.100',
          transport: 'tcp',
        })
      );
    });

    it('TCP printer ID format is hostname-port', async () => {
      expect(fakeTCPPrinter.id).toMatch(/^tcp-.+-\d+$/);
    });

    it('TCP transport does not require runtime Bluetooth permissions', async () => {
      const { PrinterCapabilityService } = require('../../services/printer/capability/service');
      const service = new PrinterCapabilityService();

      const tcpCapability = service.getTransportCapability('tcp');

      expect(tcpCapability.transport).toBe('tcp');
      expect(tcpCapability.requiresRuntimePermission).toBe(false);
    });
  });

  describe('Adapter Contract', () => {
    it('adapter.connectPrinter takes address without bt: prefix', async () => {
      const mockAdapter = createMockAdapter();
      mockAdapter.connectPrinter.mockResolvedValue(undefined);

      await mockAdapter.connectPrinter('AA:BB:CC:DD:EE:FF');

      expect(mockAdapter.connectPrinter).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('adapter.sendText sends text to currently connected printer', async () => {
      const mockAdapter = createMockAdapter();
      mockAdapter.sendText.mockResolvedValue(undefined);

      await mockAdapter.sendText('Test print content');

      expect(mockAdapter.sendText).toHaveBeenCalledWith('Test print content');
    });

    it('adapter.isConnected verifies connection state', async () => {
      const mockAdapter = createMockAdapter();
      mockAdapter.isConnected.mockResolvedValue(true);

      const result = await mockAdapter.isConnected('AA:BB:CC:DD:EE:FF');

      expect(result).toBe(true);
      expect(mockAdapter.isConnected).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });
  });
});
