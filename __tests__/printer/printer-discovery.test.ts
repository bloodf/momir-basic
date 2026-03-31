import ThermalPrinter, { resetPrinterMock, FAKE_DEVICES } from 'react-native-thermal-printer-driver';

describe('Printer Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrinterMock();
  });

  it('scan returns paired and found devices', async () => {
    const result = await ThermalPrinter.scan();

    expect(result.paired).toHaveLength(3);
    expect(result.paired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01' }),
        expect.objectContaining({ name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04' }),
        expect.objectContaining({ name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02' }),
      ])
    );
    expect(result.found).toHaveLength(0);
  });

  it('returns devices with required fields', async () => {
    const result = await ThermalPrinter.scan();

    result.paired.forEach((device: { name: string; address: string; deviceType: string }) => {
      expect(device).toHaveProperty('name');
      expect(device).toHaveProperty('address');
      expect(device).toHaveProperty('deviceType');
    });
  });

  it('testConnection succeeds for valid address', async () => {
    const result = await ThermalPrinter.testConnection('bt:AA:BB:CC:DD:EE:01');
    expect(result.success).toBe(true);
  });

  it('testConnection can report failure', async () => {
    (ThermalPrinter.testConnection as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: 'CONNECTION_FAILED', message: 'Timeout' },
    });

    const result = await ThermalPrinter.testConnection('bt:FF:FF:FF:FF:FF:FF');
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Timeout');
  });

  it('disconnect resolves without error', async () => {
    await expect(ThermalPrinter.disconnect('bt:AA:BB:CC:DD:EE:01')).resolves.not.toThrow();
  });

  it('printRaw sends data successfully', async () => {
    const data = [0x1B, 0x40, 0x48, 0x65, 0x6C, 0x6C, 0x6F]; // ESC @ Hello
    const result = await ThermalPrinter.printRaw('bt:AA:BB:CC:DD:EE:01', data);
    expect(result.success).toBe(true);
  });

  it('stopScan resolves without error', async () => {
    await expect(ThermalPrinter.stopScan()).resolves.not.toThrow();
  });

  it('scan includes found devices when available', async () => {
    (ThermalPrinter.scan as jest.Mock).mockResolvedValueOnce({
      paired: [{ name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', deviceType: 'bt' }],
      found: [{ name: 'New Printer', address: 'FF:FF:FF:FF:FF:01', deviceType: 'bt' }],
    });

    const result = await ThermalPrinter.scan();
    expect(result.paired).toHaveLength(1);
    expect(result.found).toHaveLength(1);
    expect(result.found[0].name).toBe('New Printer');
  });

  it('multiple paired devices have unique addresses', async () => {
    const result = await ThermalPrinter.scan();
    const addresses = result.paired.map((d: { address: string }) => d.address);

    expect(addresses).toContain('AA:BB:CC:DD:EE:01');
    expect(addresses).toContain('AA:BB:CC:DD:EE:02');
    expect(addresses).toContain('AA:BB:CC:DD:EE:04');
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it('FAKE_DEVICES has the expected devices', () => {
    expect(FAKE_DEVICES).toHaveLength(3);
    expect(FAKE_DEVICES[0]).toEqual(
      expect.objectContaining({ name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01' })
    );
  });
});
