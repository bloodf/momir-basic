// Mock for @finan-me/react-native-thermal-printer
// Also mapped from the old package name via jest.config.js moduleNameMapper

const FAKE_DEVICES = [
  { name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', deviceType: 'bt' },
  { name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04', deviceType: 'bt' },
  { name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02', deviceType: 'bt' },
];

const NativePrinter = {
  scanBluetoothDevices: jest.fn().mockResolvedValue({
    paired: FAKE_DEVICES,
    found: [],
  }),

  stopScanDevices: jest.fn().mockResolvedValue(true),

  testConnection: jest.fn().mockResolvedValue({ success: true }),

  disconnect: jest.fn().mockResolvedValue(undefined),

  printRaw: jest.fn().mockResolvedValue({ success: true }),

  printImage: jest.fn().mockResolvedValue({ success: true }),
};

const ThermalPrinter = { NativePrinter };

function resetPrinterMock() {
  NativePrinter.scanBluetoothDevices.mockResolvedValue({
    paired: FAKE_DEVICES,
    found: [],
  });
  NativePrinter.testConnection.mockResolvedValue({ success: true });
  NativePrinter.disconnect.mockResolvedValue(undefined);
  NativePrinter.printRaw.mockResolvedValue({ success: true });
  NativePrinter.printImage.mockResolvedValue({ success: true });
}

module.exports = { ThermalPrinter, resetPrinterMock, FAKE_DEVICES };
