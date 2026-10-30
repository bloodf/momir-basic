import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import type { PrinterPort, PrinterDiscoveryResult, PrinterDevice } from './port';
import { PrinterAdapterError, PrinterErrorCode } from './port';
import type { PrinterCapabilities, PrinterTransport } from '../../../types';
import { ErrorCategory, logger } from '@/utils/logger';

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

/**
 * Map a registry address + transport to the driver's scheme-prefixed address
 * (`bt:<MAC>`, `ble:<MAC>`, `lan:<host>:<port>`). Already-prefixed addresses pass through.
 */
export function toDriverAddress(address: string, transport?: PrinterTransport): string {
  if (address.startsWith('bt:') || address.startsWith('ble:') || address.startsWith('lan:')) {
    return address;
  }
  switch (transport) {
    case 'tcp':
      return `lan:${address}`;
    case 'ble':
      return `ble:${address}`;
    default:
      return `bt:${address}`;
  }
}

interface ActiveConnection {
  address: string;
  transport: PrinterTransport;
  driverAddress: string;
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
  private _connection: ActiveConnection | null = null;

  /** Driver address of the active connection, or throws NOT_CONNECTED. */
  private requireConnection(action: string): ActiveConnection {
    if (!this._connection) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        `No printer connected — cannot ${action}`
      );
    }
    return this._connection;
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
    logger.debug(ErrorCategory.Printer, `adapter returning ${devices.length} devices`);
    return devices;
  }

  async connectPrinter(address: string, transport: PrinterTransport = 'classic'): Promise<void> {
    const driverAddress = toDriverAddress(address, transport);
    try {
      await NativeModules.ThermalPrinterDriver.connect(driverAddress, 10000);
      this._connection = { address, transport, driverAddress };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.CONNECTION_FAILED,
        `Failed to connect to ${address}: ${msg}`,
        transport
      );
    }
  }

  /** Resolve the driver address, reusing the active connection's when the address matches. */
  private resolveDriverAddress(address: string, transport?: PrinterTransport): string {
    if (this._connection && this._connection.address === address) {
      return this._connection.driverAddress;
    }
    return toDriverAddress(address, transport);
  }

  async disconnectPrinter(address?: string): Promise<void> {
    try {
      const driverAddress = address ? this.resolveDriverAddress(address) : null;
      await NativeModules.ThermalPrinterDriver.disconnect(driverAddress);

      if (!address || address === this._connection?.address) {
        this._connection = null;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.DISCONNECT_FAILED,
        `Failed to disconnect from ${address || 'device'}: ${msg}`,
        this._connection?.transport
      );
    }
  }

  async isConnected(address: string, transport?: PrinterTransport): Promise<boolean> {
    try {
      const driverAddress = this.resolveDriverAddress(address, transport);
      const result = await NativeModules.ThermalPrinterDriver.testConnection(driverAddress);
      return result?.success === true;
    } catch (error) {
      logger.debug(ErrorCategory.Printer, 'isConnection check failed', error);
      return false;
    }
  }

  async sendText(text: string): Promise<void> {
    const connection = this.requireConnection('send text');

    try {

      const encoder = new TextEncoder();
      const textBytes = encoder.encode(text + '\n');
      const data = [0x1B, 0x40, ...Array.from(textBytes), 0x0A];

      await NativeModules.ThermalPrinterDriver.printRaw(connection.driverAddress, data, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendText failed: ${msg}`,
        connection.transport
      );
    }
  }

  async sendImage(base64: string, width: number, _height: number): Promise<void> {
    const connection = this.requireConnection('send image');

    try {

      await NativeModules.ThermalPrinterDriver.printImage(connection.driverAddress, base64, 'base64', width, 0, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendImage failed: ${msg}`,
        connection.transport
      );
    }
  }

  async sendRaw(bytes: Uint8Array): Promise<void> {
    const connection = this.requireConnection('send raw bytes');

    try {
      await NativeModules.ThermalPrinterDriver.printRaw(connection.driverAddress, Array.from(bytes), true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendRaw failed: ${msg}`,
        connection.transport
      );
    }
  }

  async sendQRCode(data: string, size: number): Promise<void> {
    const connection = this.requireConnection('send QR code');

    try {

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

      await NativeModules.ThermalPrinterDriver.printRaw(connection.driverAddress, qrCommands, true, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendQRCode failed: ${msg}`,
        connection.transport
      );
    }
  }

  async cutPaper(): Promise<void> {
    const connection = this.requireConnection('cut paper');

    try {

      await NativeModules.ThermalPrinterDriver.printRaw(connection.driverAddress, [0x1D, 0x56, 0x00], false, 10000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `cutPaper failed: ${msg}`,
        connection.transport
      );
    }
  }

  async getCapabilities(): Promise<PrinterCapabilities> {
    return DEFAULT_CAPABILITIES;
  }

  async getCurrentDevice(): Promise<PrinterDevice> {
    if (!this._connection) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NO_DEVICE_CONNECTED,
        'No device connected'
      );
    }

    return {
      address: this._connection.address,
      name: 'Thermal Printer',
      transport: this._connection.transport,
    };
  }
}
