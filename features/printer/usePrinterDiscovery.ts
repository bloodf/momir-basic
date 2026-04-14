import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PrinterRecord, PrinterTransport, PrinterCapabilities } from '@/types';
import { ErrorCategory } from '@/utils/logger';
import { logger } from '@/utils/logger';
import { createAdapter } from '@/services/printer/adapters/factory';
import { printerCapabilityService, type AndroidBluetoothPermissionStatus } from '@/services/printer/capability';
import { getErrorMessage } from './types';

interface UsePrinterDiscoveryReturn {
  isScanning: boolean;
  discoveredPrinters: PrinterRecord[];
  scanError: string | null;
  permissionState: AndroidBluetoothPermissionStatus | null;
  startScan: () => Promise<PrinterRecord[]>;
  setDiscoveredPrinters: React.Dispatch<React.SetStateAction<PrinterRecord[]>>;
  setPermissionState: React.Dispatch<React.SetStateAction<AndroidBluetoothPermissionStatus | null>>;
  setScanError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function usePrinterDiscovery(): UsePrinterDiscoveryReturn {
  const isIOS = Platform.OS === 'ios';

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<PrinterRecord[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<AndroidBluetoothPermissionStatus | null>(null);

  const startScan = useCallback(async (): Promise<PrinterRecord[]> => {
    setIsScanning(true);
    setScanError(null);
    setDiscoveredPrinters([]);

    try {
      if (!isIOS) {
        await printerCapabilityService.ensureBluetoothPermissions();
      }

      const adapter = createAdapter();
      const rawDevices = await adapter.discoverPrinters();

      const now = new Date().toISOString();
      const records: PrinterRecord[] = rawDevices.map((d) => ({
        id: d.id,
        name: d.name,
        address: d.address,
        transport: d.transport as PrinterTransport,
        capabilities: d.capabilities ?? ({ supportImage: true, supportQR: true, supportCut: true, supportText: true, paperWidth: 58 } as PrinterCapabilities),
        lastSeenAt: now,
        createdAt: now,
      }));

      logger.debug(ErrorCategory.Printer, `records count: ${records.length}, setting discovered`);
      setDiscoveredPrinters(records);
      return records;
    } catch (error) {
      if (error instanceof Error && error.message.includes('[PrinterCapability]')) {
        const state = await printerCapabilityService.getAndroidPermissionState();
        setPermissionState(state.overall);
        setScanError(error.message.replace('[PrinterCapability] ', ''));
      } else {
        setScanError(getErrorMessage(error, 'Unable to scan for printers.'));
      }
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [isIOS]);

  return {
    isScanning,
    discoveredPrinters,
    scanError,
    permissionState,
    startScan,
    setDiscoveredPrinters,
    setPermissionState,
    setScanError,
  };
}
