import { FakePrinterAdapter } from '../../services/printer/adapters/fake';

describe('FakePrinterAdapter', () => {
  let adapter: FakePrinterAdapter;

  beforeEach(() => {
    adapter = new FakePrinterAdapter();
  });

  describe('discoverPrinters', () => {
    it('returns deterministic fixture devices', async () => {
      const devices = await adapter.discoverPrinters();
      expect(devices).toHaveLength(2);
      expect(devices[0].name).toBe('FakeThermal-BLE-001');
      expect(devices[0].transport).toBe('ble');
      expect(devices[1].name).toBe('FakeThermal-Classic-001');
      expect(devices[1].transport).toBe('classic');
    });

    it('returns empty array when failure mode is discover-empty', async () => {
      adapter.setFailureMode('discover-empty');
      const devices = await adapter.discoverPrinters();
      expect(devices).toHaveLength(0);
    });
  });

  describe('connectPrinter / disconnectPrinter', () => {
    it('connect and disconnect work', async () => {
      const deviceId = 'fake-ble-001';
      await adapter.connectPrinter(deviceId);
      expect(await adapter.isConnected(deviceId)).toBe(true);
      await adapter.disconnectPrinter(deviceId);
      expect(await adapter.isConnected(deviceId)).toBe(false);
    });

    it('connect and disconnect also work with device address', async () => {
      const address = 'AA:BB:CC:DD:EE:FF';
      await adapter.connectPrinter(address);
      expect(await adapter.isConnected(address)).toBe(true);
      await adapter.disconnectPrinter(address);
      expect(await adapter.isConnected(address)).toBe(false);
    });

    it('throws when connecting unknown device', async () => {
      await expect(adapter.connectPrinter('unknown-id')).rejects.toThrow('Device unknown-id not found');
    });

    it('throws when connecting with connect-timeout failure mode', async () => {
      adapter.setFailureMode('connect-timeout');
      await expect(adapter.connectPrinter('fake-ble-001')).rejects.toThrow('Connection timeout');
    });
  });

  describe('sendText', () => {
    it('succeeds when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      await expect(adapter.sendText('Hello')).resolves.toBeUndefined();
    });

    it('throws when not connected', async () => {
      await expect(adapter.sendText('Hello')).rejects.toThrow('No printer connected');
    });

    it('throws with write-error failure mode', async () => {
      await adapter.connectPrinter('fake-ble-001');
      adapter.setFailureMode('write-error');
      await expect(adapter.sendText('Hello')).rejects.toThrow('Write error');
    });
  });

  describe('sendImage', () => {
    it('succeeds when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      await expect(adapter.sendImage('base64data', 100, 100)).resolves.toBeUndefined();
    });

    it('throws when not connected', async () => {
      await expect(adapter.sendImage('base64data', 100, 100)).rejects.toThrow('No printer connected');
    });
  });

  describe('sendQRCode', () => {
    it('succeeds when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      await expect(adapter.sendQRCode('http://example.com', 100)).resolves.toBeUndefined();
    });

    it('throws when not connected', async () => {
      await expect(adapter.sendQRCode('http://example.com', 100)).rejects.toThrow('No printer connected');
    });
  });

  describe('cutPaper', () => {
    it('succeeds when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      await expect(adapter.cutPaper()).resolves.toBeUndefined();
    });

    it('throws when not connected', async () => {
      await expect(adapter.cutPaper()).rejects.toThrow('No printer connected');
    });
  });

  describe('getCapabilities', () => {
    it('returns capabilities when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      const caps = await adapter.getCapabilities();
      expect(caps.supportText).toBe(true);
      expect(caps.supportImage).toBe(true);
      expect(caps.paperWidth).toBe(58);
    });

    it('throws when not connected', async () => {
      await expect(adapter.getCapabilities()).rejects.toThrow('No printer connected');
    });
  });

  describe('failure mode injection', () => {
    it('setFailureMode controls connect-timeout behavior', async () => {
      adapter.setFailureMode('connect-timeout');
      await expect(adapter.connectPrinter('fake-ble-001')).rejects.toThrow('Connection timeout');
      adapter.setFailureMode(null);
      await expect(adapter.connectPrinter('fake-ble-001')).resolves.toBeUndefined();
    });

    it('setFailureMode controls write-error behavior', async () => {
      await adapter.connectPrinter('fake-ble-001');
      adapter.setFailureMode('write-error');
      await expect(adapter.sendText('test')).rejects.toThrow('Write error');
      adapter.setFailureMode(null);
      await expect(adapter.sendText('test')).resolves.toBeUndefined();
    });

    it('setFailureMode controls discover-empty behavior', async () => {
      adapter.setFailureMode('discover-empty');
      await expect(adapter.discoverPrinters()).resolves.toEqual([]);
      adapter.setFailureMode(null);
      await expect(adapter.discoverPrinters()).resolves.toHaveLength(2);
    });
  });
});
