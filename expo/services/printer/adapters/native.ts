import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import type { PrinterPort, PrinterDiscoveryResult, PrinterDevice } from './port';
import { PrinterAdapterError, PrinterErrorCode } from './port';
import type { PrinterCapabilities, PrinterTransport } from '../../../types';

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58,
};

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every(
    (result) => result === PermissionsAndroid.RESULTS.GRANTED
  );
}

function toBtAddress(address: string): string {
  if (address.startsWith('bt:') || address.startsWith('ble:') || address.startsWith('lan:')) {
    return address;
  }
  return `bt:${address}`;
}

interface ScanDevice {
  name: string;
  address: string;
  deviceType?: string;
}

interface ScanResult {
  paired?: ScanDevice[];
  found?: ScanDevice[];
}

export class NativeThermalPrinterAdapter implements PrinterPort {
  private _connectedAddress: string | null = null;

  private getThermalPrinter() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-thermal-printer-driver').default;
  }

  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      throw new PrinterAdapterError(
        PrinterErrorCode.CONNECTION_REJECTED,
        'Bluetooth permissions not granted',
        'ble'
      );
    }

    const result: ScanResult = await NativeModules.ThermalPrinterDriver.scanDevices();

    const devices: PrinterDiscoveryResult[] = [];
    const seen = new Set<string>();

    const addDevices = (list: ScanDevice[]) => {
      for (const device of list) {
        if (!device.address || seen.has(device.address)) continue;
        seen.add(device.address);

        const transport: PrinterTransport =
          device.deviceType === 'ble' ? 'ble' : 'classic';

        devices.push({
          id: device.address,
          name: device.name || 'Unknown Printer',
          transport,
          address: device.address,
          capabilities: DEFAULT_CAPABILITIES,
        });
      }
    };

    if (result.paired) addDevices(result.paired);
    if (result.found) addDevices(result.found);

    // eslint-disable-next-line no-console
    console.error('[DIAG] adapter returning', devices.length, 'devices');
    return devices;
  }

  async connectPrinter(address: string): Promise<void> {
    try {
      const btAddress = toBtAddress(address);
      await NativeModules.ThermalPrinterDriver.connect(btAddress, 10000);
      this._connectedAddress = address;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.CONNECTION_FAILED,
        `Failed to connect to ${address}: ${msg}`,
        'classic'
      );
    }
  }

  async disconnectPrinter(address?: string): Promise<void> {
    try {
      const btAddress = address ? toBtAddress(address) : null;
      await NativeModules.ThermalPrinterDriver.disconnect(btAddress);

      if (!address || address === this._connectedAddress) {
        this._connectedAddress = null;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.DISCONNECT_FAILED,
        `Failed to disconnect from ${address || 'device'}: ${msg}`,
        'classic'
      );
    }
  }

  async isConnected(address: string): Promise<boolean> {
    try {
      const btAddress = toBtAddress(address);
      const result = await NativeModules.ThermalPrinterDriver.testConnection(btAddress);
      return result?.success === true;
    } catch {
      return false;
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this._connectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send text'
      );
    }

    try {
      const ThermalPrinter = this.getThermalPrinter();
      const btAddress = toBtAddress(this._connectedAddress);

      const encoder = new TextEncoder();
      const textBytes = encoder.encode(text + '\n');
      const data = [0x1B, 0x40, ...Array.from(textBytes), 0x0A];

      await NativeModules.ThermalPrinterDriver.printRaw(btAddress, data, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendText failed: ${msg}`,
        'classic'
      );
    }
  }

  async sendImage(base64: string, width: number, _height: number): Promise<void> {
    if (!this._connectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send image'
      );
    }

    try {
      const ThermalPrinter = this.getThermalPrinter();
      const btAddress = toBtAddress(this._connectedAddress);
      const { image } = require('react-native-thermal-printer-driver');

      await NativeModules.ThermalPrinterDriver.printImage(btAddress, base64, 'base64', width, 0, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendImage failed: ${msg}`,
        'classic'
      );
    }
  }

  async sendQRCode(data: string, size: number): Promise<void> {
    if (!this._connectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send QR code'
      );
    }

    try {
      const ThermalPrinter = this.getThermalPrinter();
      const btAddress = toBtAddress(this._connectedAddress);

      const dataBytes = new TextEncoder().encode(data);
      const storeLen = dataBytes.length + 3;
      const pL = storeLen & 0xFF;
      const pH = (storeLen >> 8) & 0xFF;

      const qrCommands: number[] = [
        0x1B, 0x40,
        0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
        0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, Math.min(size, 16),
        0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x33,
        0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30,
        ...Array.from(dataBytes),
        0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30,
        0x0A,
      ];

      await NativeModules.ThermalPrinterDriver.printRaw(btAddress, qrCommands, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendQRCode failed: ${msg}`,
        'classic'
      );
    }
  }

  async cutPaper(): Promise<void> {
    if (!this._connectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot cut paper'
      );
    }

    try {
      const ThermalPrinter = this.getThermalPrinter();
      const btAddress = toBtAddress(this._connectedAddress);

      await NativeModules.ThermalPrinterDriver.printRaw(btAddress, [0x1D, 0x56, 0x00], false, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `cutPaper failed: ${msg}`,
        'classic'
      );
    }
  }

  async getCapabilities(): Promise<PrinterCapabilities> {
    return DEFAULT_CAPABILITIES;
  }

  async getCurrentDevice(): Promise<PrinterDevice> {
    if (!this._connectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NO_DEVICE_CONNECTED,
        'No device connected',
        'classic'
      );
    }

    return {
      address: this._connectedAddress,
      name: 'Thermal Printer',
      transport: 'classic',
    };
  }
}
