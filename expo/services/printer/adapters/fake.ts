import type { PrinterPort, PrinterDiscoveryResult } from './port';
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

  setFailureMode(mode: FailureMode): void {
    this.failureMode = mode;
  }

  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    if (this.failureMode === 'discover-empty') {
      return [];
    }
    return [...FIXTURE_DEVICES];
  }

  async connectPrinter(deviceId: string): Promise<void> {
    if (this.failureMode === 'connect-timeout') {
      throw new Error('Connection timeout');
    }
    const device = FIXTURE_DEVICES.find(d => d.id === deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    this.connectedDevices.add(deviceId);
  }

  async disconnectPrinter(deviceId: string): Promise<void> {
    this.connectedDevices.delete(deviceId);
  }

  async isConnected(deviceId: string): Promise<boolean> {
    return this.connectedDevices.has(deviceId);
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
      throw new Error('No printer connected');
    }
    return DEFAULT_CAPABILITIES;
  }

  private hasConnectedDevice(): boolean {
    return this.connectedDevices.size > 0;
  }
}
