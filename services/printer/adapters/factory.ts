import { Platform, NativeModules } from 'react-native';
import type { PrinterPort } from './port';

/**
 * Error thrown when printer functionality is unavailable on the current platform.
 */
export class UnsupportedPlatformError extends Error {
  readonly platform: string;
  constructor(platform: string) {
    super(`Thermal printing is not supported on ${platform}.`);
    this.name = 'UnsupportedPlatformError';
    this.platform = platform;
  }
}

/**
 * Error thrown when the native thermal printer module is not available.
 */
export class MissingNativeModuleError extends Error {
  constructor() {
    super('ThermalPrinterDriver native module is not available. Ensure react-native-thermal-printer-driver is properly installed and linked.');
    this.name = 'MissingNativeModuleError';
  }
}

/**
 * Error thrown when no suitable printer transport is available.
 */
export class UnavailableTransportError extends Error {
  constructor(reason: string) {
    super(`Printer transport unavailable: ${reason}`);
    this.name = 'UnavailableTransportError';
  }
}

/**
 * Checks if react-native-thermal-printer-driver native module is available.
 * The package registers as 'ThermalPrinterDriver' in NativeModules.
 */
function isNativeModuleAvailable(): boolean {
  return NativeModules.ThermalPrinterDriver != null;
}

/**
 * Creates the appropriate printer adapter for the current platform and environment.
 *
 * @throws {UnsupportedPlatformError} If running on web platform
 * @throws {MissingNativeModuleError} If the RNThermalPrinter native module is not available
 */
export function createAdapter(): PrinterPort {
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    throw new UnsupportedPlatformError('web');
  }

  if (!isNativeModuleAvailable()) {
    throw new MissingNativeModuleError();
  }

  // Dynamically import native adapter to avoid eager loading of native module on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NativeThermalPrinterAdapter } = require('./native');
  return new NativeThermalPrinterAdapter();
}