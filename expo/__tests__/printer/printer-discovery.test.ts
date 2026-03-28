import ReactNativePosPrinter, { ThermalPrinterDevice, resetPrinterMock } from 'react-native-thermal-pos-printer';

describe('Printer Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrinterMock();
  });

  it('discovers fake BLE printers via getDeviceList', async () => {
    const printers = await ReactNativePosPrinter.getDeviceList();
    
    expect(printers).toHaveLength(3);
    expect(printers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', type: 'BLUETOOTH' }),
        expect.objectContaining({ name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04', type: 'BLUETOOTH' }),
        expect.objectContaining({ name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02', type: 'BLUETOOTH' }),
      ])
    );
  });

  it('returns ThermalPrinterDevice instances with required fields', async () => {
    const printers = await ReactNativePosPrinter.getDeviceList();
    
    printers.forEach(printer => {
      expect(printer).toBeInstanceOf(ThermalPrinterDevice);
      expect(printer).toHaveProperty('name');
      expect(printer).toHaveProperty('address');
      expect(printer).toHaveProperty('id');
      expect(printer).toHaveProperty('type');
      expect(printer).toHaveProperty('connected');
    });
  });

  it('discovers printers with RSSI signal strength', async () => {
    const printers = await ReactNativePosPrinter.getDeviceList();
    
    printers.forEach(printer => {
      expect(typeof printer.rssi).toBe('number');
      expect(printer.rssi).toBeLessThan(0);
    });
  });

  it('connects to a valid printer address', async () => {
    const device = await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    
    expect(device).toBeInstanceOf(ThermalPrinterDevice);
    expect(device.address).toBe('AA:BB:CC:DD:EE:01');
    expect(device.name).toBe('POS-58 BLE');
    expect(device.connected).toBe(true);
  });

  it('throws error when connecting to unknown address', async () => {
    await expect(ReactNativePosPrinter.connectPrinter('invalid-address')).rejects.toThrow(
      'Device with address invalid-address not found'
    );
  });

  it('isConnected returns false when not connected', async () => {
    const connected = await ReactNativePosPrinter.isConnected();
    expect(connected).toBe(false);
  });

  it('isConnected returns true after connecting', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    const connected = await ReactNativePosPrinter.isConnected();
    expect(connected).toBe(true);
  });

  it('disconnects successfully', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    await ReactNativePosPrinter.disconnectPrinter();
    const connected = await ReactNativePosPrinter.isConnected();
    expect(connected).toBe(false);
  });

  it('prints text successfully when connected', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    await expect(ReactNativePosPrinter.printText('Hello, Printer!')).resolves.not.toThrow();
  });

  it('throws when printing text without connection', async () => {
    await expect(ReactNativePosPrinter.printText('Hello, Printer!')).rejects.toThrow(
      'No printer connected'
    );
  });

  it('prints image successfully when connected', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    await expect(ReactNativePosPrinter.printImage('base64data')).resolves.not.toThrow();
  });

  it('throws when printing image without connection', async () => {
    await expect(ReactNativePosPrinter.printImage('base64data')).rejects.toThrow(
      'No printer connected'
    );
  });

  it('prints QR code successfully when connected', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    await expect(ReactNativePosPrinter.printQRCode('https://example.com')).resolves.not.toThrow();
  });

  it('throws when printing QR code without connection', async () => {
    await expect(ReactNativePosPrinter.printQRCode('https://example.com')).rejects.toThrow(
      'No printer connected'
    );
  });

  it('cuts paper successfully when connected', async () => {
    await ReactNativePosPrinter.connectPrinter('AA:BB:CC:DD:EE:01');
    await expect(ReactNativePosPrinter.cutPaper()).resolves.not.toThrow();
  });

  it('throws when cutting paper without connection', async () => {
    await expect(ReactNativePosPrinter.cutPaper()).rejects.toThrow(
      'No printer connected'
    );
  });

  it('ThermalPrinterDevice instance methods work correctly', async () => {
    const printers = await ReactNativePosPrinter.getDeviceList();
    const printer = printers[0];
    
    expect(printer.isConnected()).toBe(false);
    
    await printer.connect();
    expect(printer.isConnected()).toBe(true);
    expect(printer.getName()).toBe('POS-58 BLE');
    expect(printer.getAddress()).toBe('AA:BB:CC:DD:EE:01');
    expect(printer.getType()).toBe('BLUETOOTH');
    
    await printer.disconnect();
    expect(printer.isConnected()).toBe(false);
  });

  it('getCurrentDevice returns connected device', async () => {
    const printers = await ReactNativePosPrinter.getDeviceList();
    await ReactNativePosPrinter.connectPrinter(printers[0].address);
    
    const current = ReactNativePosPrinter.getCurrentDevice();
    expect(current).toBeInstanceOf(ThermalPrinterDevice);
    expect(current?.address).toBe(printers[0].address);
  });

  it('getCurrentDevice returns null when disconnected', async () => {
    const current = ReactNativePosPrinter.getCurrentDevice();
    expect(current).toBeNull();
  });

  it('multiple devices can be listed', async () => {
    const devices = await ReactNativePosPrinter.getDeviceList();
    expect(devices).toHaveLength(3);
    
    const addresses = devices.map(d => d.address);
    expect(addresses).toContain('AA:BB:CC:DD:EE:01');
    expect(addresses).toContain('AA:BB:CC:DD:EE:02');
    expect(addresses).toContain('AA:BB:CC:DD:EE:04');
  });
});