// Mock for react-native-thermal-printer-driver

const FAKE_DEVICES = [
  { name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', deviceType: 'bt' },
  { name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04', deviceType: 'bt' },
  { name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02', deviceType: 'bt' },
];

const ThermalPrinter = {
  scan: jest.fn().mockResolvedValue({ paired: FAKE_DEVICES, found: [] }),
  stopScan: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  testConnection: jest.fn().mockResolvedValue({ success: true }),
  isConnected: jest.fn().mockResolvedValue(false),
  print: jest.fn().mockResolvedValue({ success: true }),
  printRaw: jest.fn().mockResolvedValue({ success: true }),
  onDeviceFound: jest.fn().mockReturnValue({ remove: jest.fn() }),
  onScanCompleted: jest.fn().mockReturnValue({ remove: jest.fn() }),
  onConnectionChanged: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

function resetPrinterMock() {
  ThermalPrinter.scan.mockResolvedValue({ paired: FAKE_DEVICES, found: [] });
  ThermalPrinter.connect.mockResolvedValue(undefined);
  ThermalPrinter.disconnect.mockResolvedValue(undefined);
  ThermalPrinter.testConnection.mockResolvedValue({ success: true });
  ThermalPrinter.isConnected.mockResolvedValue(false);
  ThermalPrinter.print.mockResolvedValue({ success: true });
  ThermalPrinter.printRaw.mockResolvedValue({ success: true });
}

// Node factory mocks (matching the real library's named exports)
function image(source) { return { type: 'image', source }; }
function text(content, style) { return { type: 'text', content, style }; }
function qr(content, options) { return { type: 'qr', content, ...options }; }
function cut(options) { return { type: 'cut', partial: options?.partial }; }
function feed(lines) { return { type: 'feed', lines }; }

module.exports = { default: ThermalPrinter, ...ThermalPrinter, resetPrinterMock, FAKE_DEVICES, image, text, qr, cut, feed };
