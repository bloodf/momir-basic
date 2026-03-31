import { FakePrinterAdapter } from '../../services/printer/adapters/fake';

describe('FakePrinterAdapter - Contract Documentation', () => {
  let adapter: FakePrinterAdapter;

  beforeEach(() => {
    adapter = new FakePrinterAdapter();
  });

  describe('discoverPrinters', () => {
    it('returns fixture devices with canonical identity', async () => {
      const devices = await adapter.discoverPrinters();
      expect(devices).toHaveLength(2);
      devices.forEach(d => {
        expect(d.address).toBeDefined();
        expect(d.transport).toMatch(/^(ble|classic|tcp)$/);
      });
    });
  });

  describe('connectPrinter - canonical identity', () => {
    it('connect accepts device id and tracks by canonical address', async () => {
      const deviceId = 'fake-ble-001';
      await adapter.connectPrinter(deviceId);
      const address = 'AA:BB:CC:DD:EE:FF';
      expect(await adapter.isConnected(address)).toBe(true);
    });

    it('disconnect clears by canonical address', async () => {
      const address = 'AA:BB:CC:DD:EE:FF';
      await adapter.connectPrinter(address);
      expect(await adapter.isConnected(address)).toBe(true);
      await adapter.disconnectPrinter(address);
      expect(await adapter.isConnected(address)).toBe(false);
    });
  });

  describe('sendText', () => {
    it('throws when no printer connected (contract)', async () => {
      await expect(adapter.sendText('Hello')).rejects.toThrow('No printer connected');
    });
  });

  describe('sendImage', () => {
    it('throws when no printer connected (contract)', async () => {
      await expect(adapter.sendImage('base64data', 100, 100)).rejects.toThrow('No printer connected');
    });
  });

  describe('sendQRCode', () => {
    it('throws when no printer connected (contract)', async () => {
      await expect(adapter.sendQRCode('http://example.com', 100)).rejects.toThrow('No printer connected');
    });
  });

  describe('cutPaper', () => {
    it('throws when no printer connected (contract)', async () => {
      await expect(adapter.cutPaper()).rejects.toThrow('No printer connected');
    });
  });

  describe('getCapabilities', () => {
    it('throws when not connected (contract)', async () => {
      await expect(adapter.getCapabilities()).rejects.toThrow('No printer connected');
    });

    it('returns capabilities when connected', async () => {
      await adapter.connectPrinter('fake-ble-001');
      const caps = await adapter.getCapabilities();
      expect(caps.paperWidth).toBe(58);
    });
  });
});
