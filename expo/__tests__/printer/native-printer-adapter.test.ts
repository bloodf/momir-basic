import ReactNativePosPrinter, { resetPrinterMock } from 'react-native-thermal-pos-printer';
import { NativeThermalPrinterAdapter } from '../../services/printer/adapters/native';

describe('NativeThermalPrinterAdapter', () => {
  let adapter: NativeThermalPrinterAdapter;

  beforeEach(() => {
    resetPrinterMock();
    adapter = new NativeThermalPrinterAdapter();
  });

  describe('discoverPrinters', () => {
    it('returns discovered devices from native module', async () => {
      const devices = await adapter.discoverPrinters();
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0].id).toBeDefined();
      expect(devices[0].name).toBeDefined();
    });

    it('maps device types to transport enum', async () => {
      const devices = await adapter.discoverPrinters();
      devices.forEach(device => {
        expect(['ble', 'classic', 'tcp']).toContain(device.transport);
      });
    });
  });

  describe('connectPrinter', () => {
    it('calls native connectPrinter with address', async () => {
      const devices = await adapter.discoverPrinters();
      const firstDevice = devices[0];
      await expect(adapter.connectPrinter(firstDevice.address)).resolves.toBeUndefined();
    });
  });

  describe('disconnectPrinter', () => {
    it('calls native disconnectPrinter', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await expect(adapter.disconnectPrinter(devices[0].address)).resolves.toBeUndefined();
    });
  });

  describe('isConnected', () => {
    it('returns true after connecting', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      expect(await adapter.isConnected(devices[0].address)).toBe(true);
    });

    it('returns false after disconnecting', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await adapter.disconnectPrinter(devices[0].address);
      expect(await adapter.isConnected(devices[0].address)).toBe(false);
    });
  });

  describe('sendText', () => {
    it('calls native printText', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await expect(adapter.sendText('Test print')).resolves.toBeUndefined();
    });

    it('throws when no printer connected', async () => {
      await expect(adapter.sendText('Test print')).rejects.toThrow('No printer connected');
    });
  });

  describe('sendImage', () => {
    it('calls native printImage', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await expect(adapter.sendImage('base64data', 100, 100)).resolves.toBeUndefined();
    });
  });

  describe('sendQRCode', () => {
    it('calls native printQRCode', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await expect(adapter.sendQRCode('http://example.com', 100)).resolves.toBeUndefined();
    });
  });

  describe('cutPaper', () => {
    it('calls native cutPaper', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      await expect(adapter.cutPaper()).resolves.toBeUndefined();
    });
  });

  describe('getCapabilities', () => {
    it('returns default capabilities when connected', async () => {
      const devices = await adapter.discoverPrinters();
      await adapter.connectPrinter(devices[0].address);
      const caps = await adapter.getCapabilities();
      expect(caps.supportText).toBe(true);
      expect(caps.supportImage).toBe(true);
      expect(caps.paperWidth).toBe(58);
    });

    it('throws when not connected', async () => {
      await expect(adapter.getCapabilities()).rejects.toThrow('No printer connected');
    });
  });
});
