import { Platform, NativeModules } from 'react-native';
import type { PrinterPort } from './port';
import { NativeThermalPrinterAdapter } from './native';
import { FakePrinterAdapter } from './fake';

export function createAdapter(): PrinterPort {
  const isWeb = Platform.OS === 'web';
  const isTest = process.env.NODE_ENV === 'test';
  const hasNativeModule = NativeModules.ThermalPrinter != null;

  if (isWeb || isTest || !hasNativeModule) {
    return new FakePrinterAdapter();
  }

  return new NativeThermalPrinterAdapter();
}
