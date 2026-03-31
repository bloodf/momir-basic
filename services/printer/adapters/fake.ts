import type { PrinterPort, PrinterDiscoveryResult } from './port';
import { PrinterAdapterError, PrinterErrorCode } from './port';
import type { PrinterCapabilities } from '../../../types';

type FailureMode = 'connect-timeout' | 'write-error' | 'discover-empty' | null;

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58,
};

const FIXTURE_DEVICES: PrinterDiscoveryResult[] = [
  {
    id: 'fake-ble-001',
    name: 'FakeThermal-BLE-001',
    transport: 'ble',
    address: 'AA:BB:CC:DD:EE:FF',
    capabilities: DEFAULT_CAPABILITIES,
  },
  {
    id: 'fake-classic-001',
    name: 'FakeThermal-Classic-001',
    transport: 'classic',
    address: '11:22:33:44:55:66',
    capabilities: DEFAULT_CAPABILITIES,
  },
];

export class FakePrinterAdapter implements PrinterPort {
  private failureMode: FailureMode = null;
  private connectedDevices: Set<string> = new Set();

  private resolveDevice(deviceId: string): PrinterDiscoveryResult | undefined {
    return FIXTURE_DEVICES.find(
      (device) => device.id === deviceId || device.address === deviceId
    );
  }

  setFailureMode(mode: FailureMode): void {
    this.failureMode = mode;
  }

  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    if (this.failureMode === 'discover-empty') {
      return [];
    }
    return [...FIXTURE_DEVICES];
  }

  async connectPrinter(deviceId: string, _transport?: string): Promise<void> {
    if (this.failureMode === 'connect-timeout') {
      throw new Error('Connection timeout');
    }
    const device = this.resolveDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    this.connectedDevices.add(device.address);
  }

  async disconnectPrinter(_address?: string): Promise<void> {
    this.connectedDevices.clear();
  }

  async isConnected(address: string): Promise<boolean> {
    return this.connectedDevices.has(address);
  }

  async sendText(_text: string): Promise<void> {
    if (this.failureMode === 'write-error') {
      throw new Error('Write error');
    }
    if (!this.hasConnectedDevice()) {
      throw new Error('No printer connected');
    }
  }

  async sendImage(_base64: string, _width?: number, _height?: number): Promise<void> {
    if (this.failureMode === 'write-error') {
      throw new Error('Write error');
    }
    if (!this.hasConnectedDevice()) {
      throw new Error('No printer connected');
    }
  }

  async sendQRCode(_data: string, _size?: number): Promise<void> {
    if (this.failureMode === 'write-error') {
      throw new Error('Write error');
    }
    if (!this.hasConnectedDevice()) {
      throw new Error('No printer connected');
    }
  }

  async cutPaper(): Promise<void> {
    if (this.failureMode === 'write-error') {
      throw new Error('Write error');
    }
    if (!this.hasConnectedDevice()) {
      throw new Error('No printer connected');
    }
  }

  async getCapabilities(): Promise<PrinterCapabilities> {
    if (!this.hasConnectedDevice()) {
      throw new PrinterAdapterError(PrinterErrorCode.NOT_CONNECTED, 'No printer connected');
    }
    return DEFAULT_CAPABILITIES;
  }

  async getCurrentDevice(): Promise<{ address: string; name: string; transport: 'ble' | 'classic' | 'tcp' }> {
    if (this.connectedDevices.size === 0) {
      throw new PrinterAdapterError(PrinterErrorCode.NO_DEVICE_CONNECTED, 'No printer connected');
    }
    const address = [...this.connectedDevices][0];
    const device = this.resolveDevice(address);
    return {
      address,
      name: device?.name ?? 'Unknown',
      transport: device?.transport ?? 'ble',
    };
  }

  private hasConnectedDevice(): boolean {
    return this.connectedDevices.size > 0;
  }
}
