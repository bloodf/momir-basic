import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PrinterRecord } from '@/types';
import { ErrorCategory } from '@/utils/logger';
import { logger } from '@/utils/logger';
import { createAdapter } from '@/services/printer/adapters/factory';
import { registryService } from '@/services/printer/registry/service';
import { upsertPrinter } from '@/services/printer/storage/repositories';
import { printerCapabilityService, type AndroidBluetoothPermissionStatus } from '@/services/printer/capability';
import { getErrorMessage } from './types';
import type { PrinterUiState } from './types';

interface UsePrinterConnectionReturn {
  connectedPrinter: PrinterRecord | null;
  isConnecting: string | null;
  connectToPrinter: (printer: PrinterRecord) => Promise<boolean>;
  disconnectPrinter: (preferredPrinterId: string | null) => Promise<void>;
  verifyConnection: (preferredPrinterId: string | null, printers?: PrinterRecord[]) => Promise<PrinterRecord | null>;
  forgetPrinter: (printer: PrinterRecord, preferredPrinterId: string | null, currentPrinters: PrinterRecord[]) => Promise<PrinterRecord[]>;
  setConnectedPrinter: React.Dispatch<React.SetStateAction<PrinterRecord | null>>;
  setIsConnecting: React.Dispatch<React.SetStateAction<string | null>>;
}

export function usePrinterConnection(
  setUiState: React.Dispatch<React.SetStateAction<PrinterUiState>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>,
  setPermissionState: React.Dispatch<React.SetStateAction<AndroidBluetoothPermissionStatus | null>>,
  savePreferredPrinter: (deviceId: string) => Promise<void>,
  onConnected?: (printer: PrinterRecord) => void,
  onDisconnected?: () => void,
): UsePrinterConnectionReturn {
  const isIOS = Platform.OS === 'ios';

  const [connectedPrinter, setConnectedPrinter] = useState<PrinterRecord | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const verifyConnection = useCallback(async (
    preferredPrinterId: string | null,
    printers?: PrinterRecord[],
  ): Promise<PrinterRecord | null> => {
    if (!preferredPrinterId) {
      setConnectedPrinter(null);
      return null;
    }

    let prefRecord: PrinterRecord | null = null;

    // First check local list
    if (printers) {
      prefRecord = printers.find((p) => p.id === preferredPrinterId) ?? null;
    }
    // Fall back to registry lookup
    if (!prefRecord) {
      prefRecord = await registryService.getPreferredPrinter();
    }

    if (!prefRecord) {
      setConnectedPrinter(null);
      return null;
    }

    try {
      const adapter = createAdapter();
      const isReallyConnected = await adapter.isConnected(prefRecord.address);

      if (isReallyConnected) {
        setConnectedPrinter(prefRecord);
        return prefRecord;
      } else {
        setConnectedPrinter(null);
        return null;
      }
    } catch (error) {
      logger.warn(ErrorCategory.Printer, 'Connection state check failed', error);
      setConnectedPrinter(null);
      return null;
    }
  }, []);

  const connectToPrinter = useCallback(async (printer: PrinterRecord): Promise<boolean> => {
    // iOS + Classic BT = unsupported
    if (isIOS && printer.transport === 'classic') {
      setUiState('unsupported_transport');
      setErrorMessage('Classic Bluetooth printers are not supported on iOS. Please use a BLE thermal printer or add a TCP/IP printer.');
      return false;
    }

    setIsConnecting(printer.id);
    setErrorMessage(null);
    setUiState('connecting');

    try {
      if (!isIOS) {
        await printerCapabilityService.ensureBluetoothPermissions();
      }

      const adapter = createAdapter();
      await adapter.connectPrinter(printer.address);

      // Persist printer to registry in background
      registryService.mergeDiscoveredWithRegistry([printer]).catch((error) => {
        logger.warn(ErrorCategory.Printer, 'Background registry merge failed', error);
      });

      // CRITICAL: Verify the connection is real before declaring connected
      const isReallyConnected = await adapter.isConnected(printer.address);

      if (isReallyConnected) {
        // Ensure printer is in DB before saving as preferred
        await upsertPrinter({
          id: printer.id,
          name: printer.name,
          address: printer.address,
          transport: printer.transport,
          capabilities: printer.capabilities,
        });
        await savePreferredPrinter(printer.id);
        setConnectedPrinter(printer);
        setUiState('connected');
        onConnected?.(printer);
        return true;
      } else {
        setErrorMessage(`Connection to ${printer.name} was not established. The printer may be out of range or unreachable.`);
        setUiState('disconnected');
        return false;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('[PrinterCapability]')) {
        const state = await printerCapabilityService.getAndroidPermissionState();
        setPermissionState(state.overall);
        if (state.overall === 'never_ask_again') {
          setUiState('permission_never_ask');
        } else {
          setUiState('permission_denied');
        }
        setErrorMessage(error.message.replace('[PrinterCapability] ', ''));
      } else {
        setErrorMessage(getErrorMessage(error, `Unable to connect to ${printer.name}.`));
        setUiState('disconnected');
      }
      return false;
    } finally {
      setIsConnecting(null);
    }
  }, [isIOS, savePreferredPrinter, setUiState, setErrorMessage, setPermissionState, onConnected]);

  const disconnectPrinter = useCallback(async (preferredPrinterId: string | null) => {
    if (!preferredPrinterId) return;

    try {
      await registryService.disconnectPrinter(preferredPrinterId);
      setConnectedPrinter(null);
      setUiState('disconnected');
      setErrorMessage(null);
      onDisconnected?.();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to disconnect printer.'));
    }
  }, [setUiState, setErrorMessage, onDisconnected]);

  const forgetPrinter = useCallback(async (
    printer: PrinterRecord,
    preferredPrinterId: string | null,
    currentPrinters: PrinterRecord[],
  ): Promise<PrinterRecord[]> => {
    await registryService.forgetPrinter(printer.id);
    if (preferredPrinterId === printer.id) {
      setConnectedPrinter(null);
      setUiState('disconnected');
    }
    const updated = currentPrinters.filter((p) => p.id !== printer.id);
    return updated;
  }, [setUiState]);

  return {
    connectedPrinter,
    isConnecting,
    connectToPrinter,
    disconnectPrinter,
    verifyConnection,
    forgetPrinter,
    setConnectedPrinter,
    setIsConnecting,
  };
}
