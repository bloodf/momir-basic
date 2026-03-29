import { Platform, NativeModules } from 'react-native';
import type { PrinterPort } from './port';
import { FakePrinterAdapter } from './fake';

export function createAdapter(): PrinterPort {
  const isWeb = Platform.OS === 'web';
  const isTest = process.env.NODE_ENV === 'test';
  const hasNativeModule = NativeModules.ThermalPrinter != null;

  if (isWeb || isTest || !hasNativeModule) {
    return new FakePrinterAdapter();
  }

  // Dynamically import native adapter to avoid eager loading of native module on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NativeThermalPrinterAdapter } = require('./native');
  return new NativeThermalPrinterAdapter();
}
