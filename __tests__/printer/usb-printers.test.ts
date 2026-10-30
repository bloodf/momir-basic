import { NativeModules, Platform } from 'react-native';

import { NativeThermalPrinterAdapter, toDriverAddress } from '@/services/printer/adapters/native';
import { validateTransport } from '@/types';

describe('USB transport', () => {
  const driver = {
    connect: jest.fn().mockResolvedValue(undefined),
    printRaw: jest.fn().mockResolvedValue({ success: true }),
    testConnection: jest.fn().mockResolvedValue({ success: true }),
    scanUsbDevices: jest.fn(),
  };
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.ThermalPrinterDriver = { ...driver };
    Platform.OS = 'android';
  });

  afterAll(() => {
    delete NativeModules.ThermalPrinterDriver;
    Platform.OS = originalOS;
  });

  it('accepts usb as a transport', () => {
    expect(validateTransport('usb')).toBe('usb');
  });

  it('passes driver usb: addresses through unchanged', () => {
    expect(toDriverAddress('usb:04b8:0202', 'usb')).toBe('usb:04b8:0202');
    expect(toDriverAddress('04b8:0202', 'usb')).toBe('usb:04b8:0202');
  });

  it('lists USB printers reported by the driver', async () => {
    NativeModules.ThermalPrinterDriver.scanUsbDevices.mockResolvedValue([
      { name: 'EPSON TM-H6000V', address: 'usb:04b8:0202', deviceType: 'usb', rssi: 0 },
      { name: 'no address', address: '', deviceType: 'usb', rssi: 0 },
    ]);

    const printers = await new NativeThermalPrinterAdapter().discoverUsbPrinters();

    expect(printers).toEqual([
      expect.objectContaining({
        id: 'usb:04b8:0202',
        name: 'EPSON TM-H6000V',
        address: 'usb:04b8:0202',
        transport: 'usb',
      }),
    ]);
  });

  it('returns no USB printers with a driver that predates USB support', async () => {
    delete NativeModules.ThermalPrinterDriver.scanUsbDevices;

    await expect(new NativeThermalPrinterAdapter().discoverUsbPrinters()).resolves.toEqual([]);
  });

  it('connects and prints over the usb: address', async () => {
    const adapter = new NativeThermalPrinterAdapter();

    await adapter.connectPrinter('usb:04b8:0202', 'usb');
    await adapter.sendRaw(new Uint8Array([0x1b, 0x40]));

    expect(NativeModules.ThermalPrinterDriver.connect).toHaveBeenCalledWith('usb:04b8:0202', 10000);
    expect(NativeModules.ThermalPrinterDriver.printRaw).toHaveBeenCalledWith('usb:04b8:0202', [0x1b, 0x40], true, 10000);
    await expect(adapter.getCurrentDevice()).resolves.toMatchObject({ transport: 'usb' });
  });
});
