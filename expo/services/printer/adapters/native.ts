import ReactNativePosPrinter from 'react-native-thermal-pos-printer';
import type { PrinterPort, PrinterDiscoveryResult } from './port';
import type { PrinterCapabilities } from '../../../types';
import { validateTransport, type PrinterTransport } from '../../../types';

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58,
};

function mapNativeTypeToTransport(type: string): PrinterTransport {
  const upperType = type.toUpperCase();
  if (upperType.includes('BLE') || upperType.includes('BLUETOOTH_LE')) {
    return 'ble';
  }
  if (upperType.includes('CLASSIC') || upperType.includes('SPP')) {
    return 'classic';
  }
  if (upperType.includes('TCP') || upperType.includes('NET')) {
    return 'tcp';
  }
  return validateTransport(type);
}

interface NativeDevice {
  address: string;
  name: string;
  type: string;
}

export class NativeThermalPrinterAdapter implements PrinterPort {
  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    await ReactNativePosPrinter.init();
    const devices = await ReactNativePosPrinter.getDeviceList();
    return (devices as unknown as NativeDevice[]).map(device => ({
      id: device.address,
      name: device.name,
      transport: mapNativeTypeToTransport(device.type),
      address: device.address,
      capabilities: DEFAULT_CAPABILITIES,
    }));
  }

  async connectPrinter(deviceId: string): Promise<void> {
    await ReactNativePosPrinter.connectPrinter(deviceId);
  }

  async disconnectPrinter(): Promise<void> {
    await ReactNativePosPrinter.disconnectPrinter();
  }

  async isConnected(address: string): Promise<boolean> {
    const connected = await ReactNativePosPrinter.isConnected();
    if (!connected) return false;
    const currentDevice = ReactNativePosPrinter.getCurrentDevice() as NativeDevice | null;
    return currentDevice?.address === address;
  }

  async sendText(text: string): Promise<void> {
    await ReactNativePosPrinter.printText(text);
  }

  async sendImage(base64: string, _width?: number, _height?: number): Promise<void> {
    await ReactNativePosPrinter.printImage(base64);
  }

  async sendQRCode(data: string, _size?: number): Promise<void> {
    await ReactNativePosPrinter.printQRCode(data);
  }

  async cutPaper(): Promise<void> {
    await ReactNativePosPrinter.cutPaper();
  }

  async getCapabilities(): Promise<PrinterCapabilities> {
    const connected = await ReactNativePosPrinter.isConnected();
    if (!connected) {
      throw new Error('No printer connected');
    }
    return DEFAULT_CAPABILITIES;
  }
}
