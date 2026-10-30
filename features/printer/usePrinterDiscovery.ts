import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PrinterRecord, PrinterTransport, PrinterCapabilities } from '@/types';
import { ErrorCategory } from '@/utils/logger';
import { logger } from '@/utils/logger';
import { createAdapter } from '@/services/printer/adapters/factory';
import { registryService } from '@/services/printer/registry/service';
import { printerCapabilityService, type AndroidBluetoothPermissionStatus } from '@/services/printer/capability';
import { getErrorMessage } from './types';

interface UsePrinterDiscoveryReturn {
  isScanning: boolean;
  discoveredPrinters: PrinterRecord[];
  scanError: string | null;
  permissionState: AndroidBluetoothPermissionStatus | null;
  startScan: () => Promise<PrinterRecord[]>;
  loadSavedPrinters: () => Promise<PrinterRecord[]>;
  setDiscoveredPrinters: React.Dispatch<React.SetStateAction<PrinterRecord[]>>;
  setPermissionState: React.Dispatch<React.SetStateAction<AndroidBluetoothPermissionStatus | null>>;
  setScanError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Merge saved registry printers with live scan results. Saved records win (they carry
 * stored capabilities); scanned devices not yet saved are appended. Scan results are
 * not persisted here — a printer is saved when the user connects to it.
 */
export function mergeSavedAndScanned(saved: PrinterRecord[], scanned: PrinterRecord[]): PrinterRecord[] {
  const savedIds = new Set(saved.map((p) => p.id));
  return [...saved, ...scanned.filter((p) => !savedIds.has(p.id))];
}

async function listSavedPrinters(): Promise<PrinterRecord[]> {
  try {
    return await registryService.listPrinters();
  } catch (error) {
    logger.warn(ErrorCategory.Printer, 'Failed to load saved printers', error);
    return [];
  }
}

export function usePrinterDiscovery(): UsePrinterDiscoveryReturn {
  const isIOS = Platform.OS === 'ios';

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<PrinterRecord[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<AndroidBluetoothPermissionStatus | null>(null);

  const loadSavedPrinters = useCallback(async (): Promise<PrinterRecord[]> => {
    const saved = await listSavedPrinters();
    setDiscoveredPrinters((current) => mergeSavedAndScanned(saved, current));
    return saved;
  }, []);

  const startScan = useCallback(async (): Promise<PrinterRecord[]> => {
    setIsScanning(true);
    setScanError(null);

    // Saved printers (including TCP, which a Bluetooth scan can never find) are always listed
    const saved = await listSavedPrinters();
    setDiscoveredPrinters(saved);

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

      const merged = mergeSavedAndScanned(saved, records);
      logger.debug(ErrorCategory.Printer, `records count: ${records.length} scanned, ${merged.length} total, setting discovered`);
      setDiscoveredPrinters(merged);
      return merged;
    } catch (error) {
      if (error instanceof Error && error.message.includes('[PrinterCapability]')) {
        const state = await printerCapabilityService.getAndroidPermissionState();
        setPermissionState(state.overall);
        setScanError(error.message.replace('[PrinterCapability] ', ''));
      } else {
        setScanError(getErrorMessage(error, 'Unable to scan for printers.'));
      }
      return saved;
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
    loadSavedPrinters,
    setDiscoveredPrinters,
    setPermissionState,
    setScanError,
  };
}
