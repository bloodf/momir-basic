const FAKE_DEVICES = [
  {
    name: 'POS-58 BLE',
    address: 'AA:BB:CC:DD:EE:01',
    id: 'AA:BB:CC:DD:EE:01',
    type: 'BLUETOOTH',
    connected: false,
    rssi: -42,
    batteryLevel: 100,
    bondState: 2,
    deviceClass: 'Printer',
    extra: {},
  },
  {
    name: 'Thermal Mini BLE',
    address: 'AA:BB:CC:DD:EE:04',
    id: 'AA:BB:CC:DD:EE:04',
    type: 'BLUETOOTH',
    connected: false,
    rssi: -55,
    batteryLevel: 85,
    bondState: 2,
    deviceClass: 'Printer',
    extra: {},
  },
  {
    name: 'Thermal-80mm BT',
    address: 'AA:BB:CC:DD:EE:02',
    id: 'AA:BB:CC:DD:EE:02',
    type: 'BLUETOOTH',
    connected: false,
    rssi: -62,
    batteryLevel: 72,
    bondState: 2,
    deviceClass: 'Printer',
    extra: {},
  },
];

class ThermalPrinterDevice {
  constructor(device) {
    this.name = device.name;
    this.address = device.address;
    this.id = device.id || device.address;
    this.type = device.type || 'BLUETOOTH';
    this.connected = device.connected || false;
    this.rssi = device.rssi;
    this.batteryLevel = device.batteryLevel;
    this.bondState = device.bondState;
    this.deviceClass = device.deviceClass;
    this.extra = device.extra || {};
  }

  async connect() {
    const device = FAKE_DEVICES.find(d => d.address === this.address);
    if (device) {
      device.connected = true;
      this.connected = true;
    }
  }

  async disconnect() {
    const device = FAKE_DEVICES.find(d => d.address === this.address);
    if (device) {
      device.connected = false;
      this.connected = false;
    }
  }

  async checkConnectionStatus() {
    return this.connected;
  }

  async getStatus() {
    return {
      online: true,
      paperOut: false,
      coverOpen: false,
      cutterError: false,
      temperature: 'NORMAL',
      voltage: 'NORMAL',
    };
  }

  async printText(text) {
    if (!this.connected) throw new Error('Printer not connected');
  }

  async printImage(imageUri) {
    if (!this.connected) throw new Error('Printer not connected');
  }

  async printQRCode(data) {
    if (!this.connected) throw new Error('Printer not connected');
  }

  async cutPaper() {
    if (!this.connected) throw new Error('Printer not connected');
  }

  isConnected() {
    return this.connected;
  }

  getName() {
    return this.name;
  }

  getAddress() {
    return this.address;
  }

  getType() {
    return this.type;
  }
}

class ReactNativePosPrinter {
  constructor() {
    throw new Error('Cannot instantiate static class');
  }

  static currentDevice = null;

  static async init() {
    return;
  }

  static async getDeviceList() {
    return FAKE_DEVICES.map(device => new ThermalPrinterDevice(device));
  }

  static async connectPrinter(address) {
    const device = FAKE_DEVICES.find(d => d.address === address);
    if (!device) {
      throw new Error(`Device with address ${address} not found`);
    }
    device.connected = true;
    this.currentDevice = new ThermalPrinterDevice(device);
    return this.currentDevice;
  }

  static async disconnectPrinter() {
    if (this.currentDevice) {
      this.currentDevice.connected = false;
      const device = FAKE_DEVICES.find(d => d.address === this.currentDevice.address);
      if (device) device.connected = false;
      this.currentDevice = null;
    }
  }

  static async isConnected() {
    return this.currentDevice?.connected || false;
  }

  static async printText(text) {
    if (!this.currentDevice?.connected) {
      throw new Error('No printer connected');
    }
  }

  static async printImage(imageUri) {
    if (!this.currentDevice?.connected) {
      throw new Error('No printer connected');
    }
  }

  static async printQRCode(data) {
    if (!this.currentDevice?.connected) {
      throw new Error('No printer connected');
    }
  }

  static async cutPaper() {
    if (!this.currentDevice?.connected) {
      throw new Error('No printer connected');
    }
  }

  static getCurrentDevice() {
    return this.currentDevice;
  }
}

export { ThermalPrinterDevice };
export default ReactNativePosPrinter;

export function resetPrinterMock() {
  FAKE_DEVICES.forEach(device => {
    device.connected = false;
  });
  ReactNativePosPrinter.currentDevice = null;
}