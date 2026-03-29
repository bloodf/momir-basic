import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import type { PrinterTransport } from '../../../types';
import {
  emitPermissionRequested,
  emitPermissionGranted,
  emitPermissionDenied,
  emitNativeError,
} from '../diagnostics';
import { PrinterErrorCode } from '../adapters/port';

export type AndroidBluetoothPermissionStatus =
  | 'granted'
  | 'denied'
  | 'never_ask_again'
  | 'undetermined';

export interface AndroidBluetoothPermissionState {
  BLUETOOTH_CONNECT: AndroidBluetoothPermissionStatus;
  BLUETOOTH_SCAN: AndroidBluetoothPermissionStatus;
  ACCESS_FINE_LOCATION: AndroidBluetoothPermissionStatus;
  overall: AndroidBluetoothPermissionStatus;
}

export interface TransportCapability {
  transport: PrinterTransport;
  isSupported: boolean;
  nativeModuleAvailable: boolean;
  reason?: string;
  requiresRuntimePermission: boolean;
}

const PERM_BLUETOOTH_CONNECT = 'android.permission.BLUETOOTH_CONNECT';
const PERM_BLUETOOTH_SCAN = 'android.permission.BLUETOOTH_SCAN';
const PERM_ACCESS_FINE_LOCATION = 'android.permission.ACCESS_FINE_LOCATION';

const RESULT_GRANTED = 'granted';
const RESULT_DENIED = 'denied';
const RESULT_NEVER_ASK_AGAIN = 'never_ask_again';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

function hasNativeModule(): boolean {
  return NativeModules.ThermalPrinter != null;
}

export class PrinterCapabilityService {
  async getAndroidPermissionState(): Promise<AndroidBluetoothPermissionState> {
    if (!isAndroid) {
      return {
        BLUETOOTH_CONNECT: 'granted',
        BLUETOOTH_SCAN: 'granted',
        ACCESS_FINE_LOCATION: 'granted',
        overall: 'granted',
      };
    }

    const connectGranted = await PermissionsAndroid.check(PERM_BLUETOOTH_CONNECT);
    const scanGranted = await PermissionsAndroid.check(PERM_BLUETOOTH_SCAN);
    const locationGranted = await PermissionsAndroid.check(PERM_ACCESS_FINE_LOCATION);

    const connect: AndroidBluetoothPermissionStatus = connectGranted ? 'granted' : 'undetermined';
    const scan: AndroidBluetoothPermissionStatus = scanGranted ? 'granted' : 'undetermined';
    const location: AndroidBluetoothPermissionStatus = locationGranted ? 'granted' : 'undetermined';

    let overall: AndroidBluetoothPermissionStatus = 'granted';
    if (connect === 'undetermined' || scan === 'undetermined' || location === 'undetermined') {
      overall = 'undetermined';
    } else {
      overall = 'granted';
    }

    return {
      BLUETOOTH_CONNECT: connect,
      BLUETOOTH_SCAN: scan,
      ACCESS_FINE_LOCATION: location,
      overall,
    };
  }

  async requestAndroidBluetoothPermissions(): Promise<AndroidBluetoothPermissionState> {
    if (!isAndroid) {
      return {
        BLUETOOTH_CONNECT: 'granted',
        BLUETOOTH_SCAN: 'granted',
        ACCESS_FINE_LOCATION: 'granted',
        overall: 'granted',
      };
    }

    emitPermissionRequested('ble');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const required: any[] = [
      PERM_BLUETOOTH_CONNECT,
      PERM_BLUETOOTH_SCAN,
      PERM_ACCESS_FINE_LOCATION,
    ];

    const results = await PermissionsAndroid.requestMultiple(required);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapResult = (result: any): AndroidBluetoothPermissionStatus => {
      if (result === RESULT_GRANTED) return 'granted';
      if (result === RESULT_NEVER_ASK_AGAIN) return 'never_ask_again';
      if (result === RESULT_DENIED) return 'denied';
      return 'undetermined';
    };

    const connect = mapResult(results[PERM_BLUETOOTH_CONNECT]);
    const scan = mapResult(results[PERM_BLUETOOTH_SCAN]);
    const location = mapResult(results[PERM_ACCESS_FINE_LOCATION]);

    let overall: AndroidBluetoothPermissionStatus = 'granted';
    if (
      connect === 'never_ask_again' ||
      scan === 'never_ask_again' ||
      location === 'never_ask_again'
    ) {
      overall = 'never_ask_again';
    } else if (
      connect === 'denied' ||
      scan === 'denied' ||
      location === 'denied'
    ) {
      overall = 'denied';
    } else if (
      connect === 'undetermined' ||
      scan === 'undetermined' ||
      location === 'undetermined'
    ) {
      overall = 'undetermined';
    }

    if (overall === 'granted') {
      emitPermissionGranted('ble');
    } else {
      emitPermissionDenied(`Bluetooth permissions ${overall}`, 'ble');
    }

    return {
      BLUETOOTH_CONNECT: connect,
      BLUETOOTH_SCAN: scan,
      ACCESS_FINE_LOCATION: location,
      overall,
    };
  }

  isNativeModuleAvailable(): boolean {
    return hasNativeModule();
  }

  getTransportCapability(transport: PrinterTransport): TransportCapability {
    const nativeAvailable = hasNativeModule();

    if (transport === 'tcp') {
      if (!nativeAvailable) {
        return {
          transport,
          isSupported: false,
          nativeModuleAvailable: false,
          reason: 'Native thermal printer module is not available.',
          requiresRuntimePermission: false,
        };
      }
      return {
        transport,
        isSupported: true,
        nativeModuleAvailable: true,
        requiresRuntimePermission: false,
      };
    }

    if (transport === 'ble') {
      if (!nativeAvailable) {
        return {
          transport,
          isSupported: false,
          nativeModuleAvailable: false,
          reason: 'Native thermal printer module is not available.',
          requiresRuntimePermission: true,
        };
      }
      return {
        transport,
        isSupported: true,
        nativeModuleAvailable: true,
        requiresRuntimePermission: isAndroid,
      };
    }

    if (transport === 'classic') {
      if (isIOS) {
        return {
          transport,
          isSupported: false,
          nativeModuleAvailable: nativeAvailable,
          reason: 'Classic Bluetooth is not supported on iOS. Only MFi/External Accessory printers are supported.',
          requiresRuntimePermission: false,
        };
      }
      if (!nativeAvailable) {
        return {
          transport,
          isSupported: false,
          nativeModuleAvailable: false,
          reason: 'Native thermal printer module is not available.',
          requiresRuntimePermission: true,
        };
      }
      return {
        transport,
        isSupported: true,
        nativeModuleAvailable: true,
        requiresRuntimePermission: true,
      };
    }

    return {
      transport,
      isSupported: false,
      nativeModuleAvailable: false,
      reason: `Unknown transport: ${transport}`,
      requiresRuntimePermission: false,
    };
  }

  getAllTransportCapabilities(): TransportCapability[] {
    return [
      this.getTransportCapability('ble'),
      this.getTransportCapability('classic'),
      this.getTransportCapability('tcp'),
    ];
  }

  isAnyBluetoothTransportAvailable(): boolean {
    const ble = this.getTransportCapability('ble');
    const classic = this.getTransportCapability('classic');
    return ble.isSupported || classic.isSupported;
  }

  async ensureBluetoothPermissions(): Promise<void> {
    if (isIOS) return;

    const state = await this.getAndroidPermissionState();

    if (state.overall === 'granted') {
      emitPermissionGranted('ble');
      return;
    }

    if (state.overall === 'denied' || state.overall === 'undetermined') {
      const newState = await this.requestAndroidBluetoothPermissions();

      if (
        newState.overall === 'denied' ||
        newState.overall === 'never_ask_again'
      ) {
        const reason =
          newState.overall === 'never_ask_again'
            ? 'Bluetooth permissions were permanently denied. Please enable them in Android Settings.'
            : 'Bluetooth permissions were denied. Please grant them to use Bluetooth printers.';
        emitPermissionDenied(reason, 'ble');
        emitNativeError('ble', PrinterErrorCode.CONNECTION_REJECTED, `Permission denied: ${reason}`);
        throw new Error(`[PrinterCapability] Permission denied: ${reason}`);
      }
    }
  }

  getPermissionDeniedMessage(state: AndroidBluetoothPermissionStatus): string {
    switch (state) {
      case 'never_ask_again':
        return 'Bluetooth permissions are permanently disabled. Open Android Settings to enable them.';
      case 'denied':
        return 'Bluetooth permissions were denied. Tap "Scan" to grant them.';
      case 'undetermined':
        return 'Bluetooth permissions are required to scan for BLE and Classic Bluetooth printers.';
      case 'granted':
        return 'Bluetooth permissions are granted.';
    }
  }
}

export const printerCapabilityService = new PrinterCapabilityService();
