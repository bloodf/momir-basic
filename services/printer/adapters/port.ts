import type { PrinterCapabilities, PrinterTransport } from '../../../types';

/**
 * Error codes for printer adapter failures.
 * Used for deterministic error handling and retry logic.
 */
export enum PrinterErrorCode {
  /** Connection failed — printer unreachable or transport error */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** Disconnection failed — cleanup error */
  DISCONNECT_FAILED = 'DISCONNECT_FAILED',
  /** Printer is not connected — operation requires active connection */
  NOT_CONNECTED = 'NOT_CONNECTED',
  /** Connection attempt rejected — pairing required or credentials invalid */
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  /** Transport type mismatch — e.g., trying to use BLE address on TCP */
  TRANSPORT_MISMATCH = 'TRANSPORT_MISMATCH',
  /** Unsupported transport for this operation */
  UNSUPPORTED_TRANSPORT = 'UNSUPPORTED_TRANSPORT',
  /** TCP-specific: invalid host or port format */
  TCP_INVALID_ADDRESS = 'TCP_INVALID_ADDRESS',
  /** TCP-specific: connection timed out */
  TCP_TIMEOUT = 'TCP_TIMEOUT',
  /** Native module unavailable or not linked */
  NATIVE_UNAVAILABLE = 'NATIVE_UNAVAILABLE',
  /** Unknown or unexpected native error */
  NATIVE_ERROR = 'NATIVE_ERROR',
  /** Send operation failed — printer unresponsive mid-write */
  SEND_FAILED = 'SEND_FAILED',
  /** No printer is currently connected — getCurrentDevice called when idle */
  NO_DEVICE_CONNECTED = 'NO_DEVICE_CONNECTED',
}

/**
 * Base class for all printer adapter errors.
 * Carries explicit error codes for transport-aware retry logic.
 */
export class PrinterAdapterError extends Error {
  readonly code: PrinterErrorCode;
  readonly transport?: PrinterTransport;

  constructor(code: PrinterErrorCode, message: string, transport?: PrinterTransport) {
    super(message);
    this.name = 'PrinterAdapterError';
    this.code = code;
    this.transport = transport;
  }
}

/**
 * Result of getCurrentDevice — explicit, never returns stale undefined.
 * Returns the connected device or throws NO_DEVICE_CONNECTED.
 */
export interface PrinterDevice {
  address: string;
  name: string;
  transport: PrinterTransport;
}

/**
 * Result of printer discovery — a snapshot of a discovered device
 * before it is registered/paired.
 */
export interface PrinterDiscoveryResult {
  /** Unique identifier for this device (address/UUID) */
  id: string;
  /** Human-readable device name */
  name: string;
  /** Transport protocol used to discover this device */
  transport: PrinterTransport;
  /** Device address (Bluetooth UUID or TCP IP) */
  address: string;
  /** Optional capabilities if known from discovery */
  capabilities?: PrinterCapabilities;
}

/**
 * Interface for low-level printer port operations.
 * All printer communication flows through this interface —
 * screens and services import from adapters/index.ts only.
 */
export interface PrinterPort {
  /**
   * Discover available printers on all transports.
   * Returns a list of discovered devices with their metadata.
   */
  discoverPrinters(): Promise<PrinterDiscoveryResult[]>;

  /**
   * Connect to a printer by its canonical address.
   * Resolves when connection is established.
   * @param address - Device address (Bluetooth UUID for BLE/Classic, IP:port for TCP)
   * @param transport - Transport type for validation; adapter infers if omitted
   */
  connectPrinter(address: string, transport?: PrinterTransport): Promise<void>;

  /**
   * Disconnect from a specific printer by address.
   * Cleans up transport-specific state; no-ops if different device is connected.
   * @param address - Canonical address of the device to disconnect (optional for backward compat)
   */
  disconnectPrinter(address?: string): Promise<void>;

  /**
   * Check if a printer is currently connected by address.
   * Returns false for stale address even if native reports connected (disconnect drift).
   */
  isConnected(address: string): Promise<boolean>;

  /**
   * Send raw text to the connected printer.
   */
  sendText(text: string): Promise<void>;

  /**
   * Send an image (base64 encoded) to the connected printer.
   * @param base64 - Base64 encoded image data (不含前缀)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   */
  sendImage(base64: string, width: number, height: number): Promise<void>;

  /**
   * Send a QR code to the connected printer.
   * @param data - String data to encode in QR code
   * @param size - QR code size in pixels
   */
  sendQRCode(data: string, size: number): Promise<void>;

  /**
   * Send raw bytes directly to the connected printer.
   * Used for full ESC/POS documents that must not go through String.fromCharCode encoding.
   * @param bytes - Raw byte array to transmit
   */
  sendRaw(bytes: Uint8Array): Promise<void>;

  /**
   * Cut paper (if cutter is available).
   */
  cutPaper(): Promise<void>;

  /**
   * Get the capabilities of the currently connected printer.
   */
  getCapabilities(): Promise<PrinterCapabilities>;

  /**
   * Get the currently connected device.
   * @throws {PrinterAdapterError} NO_DEVICE_CONNECTED when no device is connected
   */
  getCurrentDevice(): Promise<PrinterDevice>;
}
