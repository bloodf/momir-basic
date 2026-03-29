import ReactNativePosPrinter from 'react-native-thermal-pos-printer';
import type { PrinterPort, PrinterDiscoveryResult, PrinterDevice } from './port';
import { PrinterAdapterError, PrinterErrorCode } from './port';
import type { PrinterCapabilities } from '../../../types';
import { validateTransport, type PrinterTransport } from '../../../types';

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58,
};

const TCP_CONNECT_TIMEOUT_MS = 10_000;

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

function inferTransportFromAddress(address: string): PrinterTransport {
  if (address.includes(':') && address.split(':').length === 2) {
    const parts = address.split(':');
    const port = parseInt(parts[1], 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return 'tcp';
    }
  }
  return 'ble';
}

function validateTcpAddress(address: string): void {
  if (!address.includes(':')) {
    throw new PrinterAdapterError(
      PrinterErrorCode.TCP_INVALID_ADDRESS,
      `TCP address must be in host:port format, got "${address}"`,
      'tcp'
    );
  }
  const colonIndex = address.lastIndexOf(':');
  const host = address.substring(0, colonIndex);
  const portStr = address.substring(colonIndex + 1);
  const port = parseInt(portStr, 10);

  if (!host || host.trim().length === 0) {
    throw new PrinterAdapterError(
      PrinterErrorCode.TCP_INVALID_ADDRESS,
      `TCP host is empty in address "${address}"`,
      'tcp'
    );
  }
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new PrinterAdapterError(
      PrinterErrorCode.TCP_INVALID_ADDRESS,
      `TCP port is invalid in address "${address}": ${portStr}`,
      'tcp'
    );
  }
}

function validateBluetoothAddress(address: string): void {
  if (!address || address.trim().length === 0) {
    throw new PrinterAdapterError(
      PrinterErrorCode.CONNECTION_FAILED,
      `Bluetooth address cannot be empty`,
      undefined
    );
  }
}

interface NativeDevice {
  address: string;
  name: string;
  type: string;
}

export class NativeThermalPrinterAdapter implements PrinterPort {
  private _currentTransport: PrinterTransport | null = null;
  private _lastConnectedAddress: string | null = null;

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

  async connectPrinter(address: string, transport?: PrinterTransport): Promise<void> {
    const inferred = transport ?? inferTransportFromAddress(address);
    if (inferred === 'tcp') {
      validateTcpAddress(address);
    } else {
      validateBluetoothAddress(address);
    }

    let nativeError: unknown;
    try {
      await ReactNativePosPrinter.connectPrinter(address);
    } catch (err) {
      nativeError = err;
    }

    if (nativeError) {
      const msg = nativeError instanceof Error ? nativeError.message : String(nativeError);
      if (msg.toLowerCase().includes('timeout')) {
        throw new PrinterAdapterError(
          PrinterErrorCode.TCP_TIMEOUT,
          `TCP connection timed out for ${address}`,
          'tcp'
        );
      }
      if (msg.toLowerCase().includes('refused') || msg.toLowerCase().includes('reject')) {
        throw new PrinterAdapterError(
          PrinterErrorCode.CONNECTION_REJECTED,
          `Connection rejected for ${address}: ${msg}`,
          inferred
        );
      }
      throw new PrinterAdapterError(
        PrinterErrorCode.CONNECTION_FAILED,
        `Failed to connect to ${address}: ${msg}`,
        inferred
      );
    }

    this._currentTransport = inferred;
    this._lastConnectedAddress = address;
  }

  async disconnectPrinter(address?: string): Promise<void> {
    if (address !== undefined && this._lastConnectedAddress !== address) {
      return;
    }
    try {
      await ReactNativePosPrinter.disconnectPrinter();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PrinterAdapterError(
        PrinterErrorCode.DISCONNECT_FAILED,
        `Disconnect failed: ${msg}`,
        this._currentTransport ?? undefined
      );
    } finally {
      this._currentTransport = null;
      this._lastConnectedAddress = null;
    }
  }

  async isConnected(address: string): Promise<boolean> {
    const nativeConnected = await ReactNativePosPrinter.isConnected();
    if (!nativeConnected) {
      this._currentTransport = null;
      this._lastConnectedAddress = null;
      return false;
    }
    const currentDevice = ReactNativePosPrinter.getCurrentDevice() as NativeDevice | null;
    if (!currentDevice) {
      this._currentTransport = null;
      this._lastConnectedAddress = null;
      return false;
    }
    if (currentDevice.address !== this._lastConnectedAddress) {
      return false;
    }
    return currentDevice.address === address;
  }

  async sendText(text: string): Promise<void> {
    if (!this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send text'
      );
    }
    try {
      await ReactNativePosPrinter.printText(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendText failed: ${msg}`,
        this._currentTransport ?? undefined
      );
    }
  }

  async sendImage(base64: string, _width?: number, _height?: number): Promise<void> {
    if (!this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send image'
      );
    }
    try {
      await ReactNativePosPrinter.printImage(base64);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendImage failed: ${msg}`,
        this._currentTransport ?? undefined
      );
    }
  }

  async sendQRCode(data: string, _size?: number): Promise<void> {
    if (!this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot send QR code'
      );
    }
    try {
      await ReactNativePosPrinter.printQRCode(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `sendQRCode failed: ${msg}`,
        this._currentTransport ?? undefined
      );
    }
  }

  async cutPaper(): Promise<void> {
    if (!this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected — cannot cut paper'
      );
    }
    try {
      await ReactNativePosPrinter.cutPaper();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PrinterAdapterError(
        PrinterErrorCode.SEND_FAILED,
        `cutPaper failed: ${msg}`,
        this._currentTransport ?? undefined
      );
    }
  }

  async getCapabilities(): Promise<PrinterCapabilities> {
    if (!this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected'
      );
    }
    const connected = await ReactNativePosPrinter.isConnected();
    if (!connected) {
      this._currentTransport = null;
      this._lastConnectedAddress = null;
      throw new PrinterAdapterError(
        PrinterErrorCode.NOT_CONNECTED,
        'No printer connected'
      );
    }
    return DEFAULT_CAPABILITIES;
  }

  async getCurrentDevice(): Promise<PrinterDevice> {
    const connected = await ReactNativePosPrinter.isConnected();
    if (!connected || !this._lastConnectedAddress) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NO_DEVICE_CONNECTED,
        'No printer currently connected'
      );
    }
    const currentDevice = ReactNativePosPrinter.getCurrentDevice() as NativeDevice | null;
    if (!currentDevice) {
      throw new PrinterAdapterError(
        PrinterErrorCode.NO_DEVICE_CONNECTED,
        'No printer currently connected'
      );
    }
    const transport = this._currentTransport ?? inferTransportFromAddress(currentDevice.address);
    return {
      address: currentDevice.address,
      name: currentDevice.name,
      transport,
    };
  }
}