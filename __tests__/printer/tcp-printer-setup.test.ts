import { NativeModules } from 'react-native';

import type { PrinterRecord } from '@/types';
import { NativeThermalPrinterAdapter, toDriverAddress } from '@/services/printer/adapters/native';
import { createRegistryService } from '@/services/printer/registry/service';
import { mergeSavedAndScanned } from '@/features/printer/usePrinterDiscovery';

const capabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58 as const,
};

const tcpPrinter: PrinterRecord = {
  id: 'tcp-192.168.1.50-9100',
  name: 'TCP Printer (192.168.1.50)',
  address: '192.168.1.50:9100',
  transport: 'tcp',
  capabilities,
  lastSeenAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const btPrinter: PrinterRecord = {
  ...tcpPrinter,
  id: 'AA:BB:CC:DD:EE:01',
  name: 'POS-58',
  address: 'AA:BB:CC:DD:EE:01',
  transport: 'classic',
};

describe('toDriverAddress', () => {
  it('maps each transport to its driver scheme', () => {
    expect(toDriverAddress('192.168.1.50:9100', 'tcp')).toBe('lan:192.168.1.50:9100');
    expect(toDriverAddress('AA:BB:CC:DD:EE:01', 'ble')).toBe('ble:AA:BB:CC:DD:EE:01');
    expect(toDriverAddress('AA:BB:CC:DD:EE:01', 'classic')).toBe('bt:AA:BB:CC:DD:EE:01');
  });

  it('defaults to Bluetooth Classic and passes prefixed addresses through', () => {
    expect(toDriverAddress('AA:BB:CC:DD:EE:01')).toBe('bt:AA:BB:CC:DD:EE:01');
    expect(toDriverAddress('lan:10.0.0.2:9100', 'classic')).toBe('lan:10.0.0.2:9100');
  });
});

describe('NativeThermalPrinterAdapter with TCP printers', () => {
  const driver = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue({ success: true }),
    printRaw: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.ThermalPrinterDriver = driver;
  });

  afterAll(() => {
    delete NativeModules.ThermalPrinterDriver;
  });

  // CRITICAL REGRESSION TEST: TCP addresses used to be sent as bt:<host>
  it('connects and prints over lan:<host>:<port>', async () => {
    const adapter = new NativeThermalPrinterAdapter();

    await adapter.connectPrinter(tcpPrinter.address, 'tcp');
    await adapter.sendRaw(new Uint8Array([0x1b, 0x40]));

    expect(driver.connect).toHaveBeenCalledWith('lan:192.168.1.50:9100', 10000);
    expect(driver.printRaw).toHaveBeenCalledWith('lan:192.168.1.50:9100', [0x1b, 0x40], true, 10000);
    await expect(adapter.getCurrentDevice()).resolves.toMatchObject({
      address: '192.168.1.50:9100',
      transport: 'tcp',
    });
  });

  it('checks a TCP printer that is not the active connection using its transport', async () => {
    const adapter = new NativeThermalPrinterAdapter();

    await adapter.isConnected(tcpPrinter.address, 'tcp');

    expect(driver.testConnection).toHaveBeenCalledWith('lan:192.168.1.50:9100');
  });

  it('reuses the active connection address when transport is omitted', async () => {
    const adapter = new NativeThermalPrinterAdapter();
    await adapter.connectPrinter(tcpPrinter.address, 'tcp');

    await adapter.isConnected(tcpPrinter.address);
    await adapter.disconnectPrinter(tcpPrinter.address);

    expect(driver.testConnection).toHaveBeenCalledWith('lan:192.168.1.50:9100');
    expect(driver.disconnect).toHaveBeenCalledWith('lan:192.168.1.50:9100');
    await expect(adapter.getCurrentDevice()).rejects.toThrow('No device connected');
  });
});

describe('registry connects by stored address and transport', () => {
  const createMockAdapter = () => ({
    discoverPrinters: jest.fn(),
    connectPrinter: jest.fn().mockResolvedValue(undefined),
    disconnectPrinter: jest.fn(),
    isConnected: jest.fn().mockResolvedValue(true),
    sendText: jest.fn(),
    sendImage: jest.fn(),
    sendQRCode: jest.fn(),
    sendRaw: jest.fn(),
    cutPaper: jest.fn(),
    getCapabilities: jest.fn(),
    getCurrentDevice: jest.fn(),
  });

  // CRITICAL REGRESSION TEST: print flows used to pass the registry ID as the address
  it('connectPrinter resolves the record and returns the connected adapter', async () => {
    const adapter = createMockAdapter();
    const service = createRegistryService({
      repoGetPrinterById: jest.fn().mockResolvedValue(tcpPrinter),
      adapterFactory: () => adapter,
    });

    const connected = await service.connectPrinter(tcpPrinter.id);

    expect(adapter.connectPrinter).toHaveBeenCalledWith('192.168.1.50:9100', 'tcp');
    expect(connected).toBe(adapter);
  });

  it('isPrinterConnected checks the stored address and transport', async () => {
    const adapter = createMockAdapter();
    const service = createRegistryService({
      repoGetPrinterById: jest.fn().mockResolvedValue(tcpPrinter),
      adapterFactory: () => adapter,
    });

    await expect(service.isPrinterConnected(tcpPrinter.id)).resolves.toBe(true);
    expect(adapter.isConnected).toHaveBeenCalledWith('192.168.1.50:9100', 'tcp');
  });

  it('isPrinterConnected is false for unknown printers', async () => {
    const service = createRegistryService({
      repoGetPrinterById: jest.fn().mockResolvedValue(null),
      adapterFactory: createMockAdapter,
    });

    await expect(service.isPrinterConnected('missing')).resolves.toBe(false);
  });
});

describe('mergeSavedAndScanned', () => {
  // CRITICAL REGRESSION TEST: saved TCP printers used to vanish after every Bluetooth scan
  it('keeps saved printers that a Bluetooth scan cannot find', () => {
    expect(mergeSavedAndScanned([tcpPrinter], [btPrinter])).toEqual([tcpPrinter, btPrinter]);
  });

  it('prefers the saved record when a scanned device is already saved', () => {
    const scannedCopy = { ...btPrinter, name: 'Renamed in scan' };

    expect(mergeSavedAndScanned([btPrinter], [scannedCopy])).toEqual([btPrinter]);
  });
});
