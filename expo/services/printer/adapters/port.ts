import type { PrinterCapabilities, PrinterTransport } from '../../../types';

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
   * Connect to a printer by its device ID (address).
   * Resolves when connection is established.
   */
  connectPrinter(deviceId: string): Promise<void>;

  /**
   * Disconnect from a printer by its device ID (address).
   * Resolves when disconnection is complete.
   */
  disconnectPrinter(deviceId: string): Promise<void>;

  /**
   * Check if a printer is currently connected.
   */
  isConnected(deviceId: string): Promise<boolean>;

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
   * Cut paper (if cutter is available).
   */
  cutPaper(): Promise<void>;

  /**
   * Get the capabilities of the currently connected printer.
   */
  getCapabilities(): Promise<PrinterCapabilities>;
}
