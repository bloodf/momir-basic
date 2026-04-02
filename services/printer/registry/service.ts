import { Platform } from 'react-native';

import type { PrinterRecord } from '../../../types';
import type { PrinterDiscoveryResult } from '../adapters/port';
import { createAdapter } from '../adapters/factory';
import {
  upsertPrinter,
  getPrinterByAddress,
  getPrinterById,
  listPrinters,
  deletePrinter,
} from '../storage/repositories';
import {
  getPrinterPreferencesFromSettings,
  savePrinterPreferencesToSettings,
} from '../../../providers/SettingsProvider';
import {
  emitDiscoveryStarted,
  emitDiscoveryResult,
  emitDiscoveryCompleted,
  emitConnectStarted,
  emitConnectSuccess,
  emitConnectFailed,
  emitDisconnected,
  emitNativeError,
} from '../diagnostics';
import { PrinterAdapterError, PrinterErrorCode } from '../adapters/port';

function isIOS(): boolean {
  return Platform.OS === 'ios';
}

function filterTransport(printers: PrinterDiscoveryResult[]): PrinterDiscoveryResult[] {
  if (isIOS()) {
    return printers.filter((p) => p.transport !== 'classic');
  }
  return printers;
}

export interface RegistryDependencies {
  repoUpsertPrinter?: typeof upsertPrinter;
  repoGetPrinterByAddress?: typeof getPrinterByAddress;
  repoGetPrinterById?: typeof getPrinterById;
  repoListPrinters?: typeof listPrinters;
  repoDeletePrinter?: typeof deletePrinter;
  adapterFactory?: typeof createAdapter;
  getPreferences?: typeof getPrinterPreferencesFromSettings;
  savePreferences?: typeof savePrinterPreferencesToSettings;
}

export function createRegistryService(deps: RegistryDependencies = {}) {
  const repoUpsertPrinter = deps.repoUpsertPrinter ?? upsertPrinter;
  const repoGetPrinterByAddress = deps.repoGetPrinterByAddress ?? getPrinterByAddress;
  const repoGetPrinterById = deps.repoGetPrinterById ?? getPrinterById;
  const repoListPrinters = deps.repoListPrinters ?? listPrinters;
  const repoDeletePrinter = deps.repoDeletePrinter ?? deletePrinter;
  const adapterFactory = deps.adapterFactory ?? createAdapter;
  const getPreferences = deps.getPreferences ?? getPrinterPreferencesFromSettings;
  const savePreferences = deps.savePreferences ?? savePrinterPreferencesToSettings;

  // Cache the adapter instance so connection state persists across calls
  let cachedAdapter: ReturnType<typeof adapterFactory> | null = null;
  function getAdapter() {
    if (!cachedAdapter) cachedAdapter = adapterFactory();
    return cachedAdapter;
  }

  async function upsertDiscovered(discovered: PrinterDiscoveryResult): Promise<void> {
    const existing = await repoGetPrinterByAddress(discovered.address);
    if (existing) {
      await repoUpsertPrinter({
        id: existing.id,
        name: discovered.name,
        address: discovered.address,
        transport: discovered.transport,
        capabilities: discovered.capabilities ?? existing.capabilities,
      });
      return;
    }
    await repoUpsertPrinter({
      id: discovered.id,
      name: discovered.name,
      address: discovered.address,
      transport: discovered.transport,
      capabilities: discovered.capabilities ?? {
        supportImage: true,
        supportQR: true,
        supportCut: true,
        supportText: true,
        paperWidth: 58,
      },
    });
  }

  return {
    async discoverPrinters(): Promise<PrinterRecord[]> {
      const start = Date.now();
      const adapter = getAdapter();
      emitDiscoveryStarted();
      let discovered = await adapter.discoverPrinters();
      const filtered = filterTransport(discovered);
      discovered.forEach((d) => {
        const accepted = filtered.some((f) => f.address === d.address);
        emitDiscoveryResult({
          printerName: d.name,
          printerAddress: d.address,
          transport: d.transport,
          accepted,
          rejectedReason: accepted ? undefined : `Transport ${d.transport} filtered for platform`,
        });
      });
      await Promise.all(filtered.map((d) => upsertDiscovered(d)));
      emitDiscoveryCompleted(Date.now() - start, filtered.length);
      return repoListPrinters();
    },

    async connectPrinter(deviceId: string): Promise<void> {
      const printer = await repoGetPrinterById(deviceId);
      if (!printer) {
        throw new Error(`Printer with id ${deviceId} not found in registry`);
      }
      let adapter: ReturnType<typeof adapterFactory>;
      try {
        adapter = getAdapter();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitConnectFailed(printer.address, printer.transport, PrinterErrorCode.CONNECTION_FAILED, msg, 0);
        throw err;
      }
      const start = Date.now();
      emitConnectStarted(printer.address, printer.transport);
      try {
        await adapter.connectPrinter(printer.address);
        emitConnectSuccess(printer.address, printer.name, printer.transport, Date.now() - start);
      } catch (err) {
        const code = err instanceof PrinterAdapterError ? err.code : PrinterErrorCode.CONNECTION_FAILED;
        const msg = err instanceof Error ? err.message : String(err);
        emitConnectFailed(printer.address, printer.transport, code, msg, Date.now() - start);
        emitNativeError(printer.transport, code, msg);
        throw err;
      }
    },

    async disconnectPrinter(deviceId: string): Promise<void> {
      const printer = await repoGetPrinterById(deviceId);
      if (!printer) {
        return;
      }
      const adapter = getAdapter();
      await adapter.disconnectPrinter(printer.address);
      emitDisconnected(printer.address, printer.transport);
    },

    async savePreferredPrinter(deviceId: string): Promise<void> {
      const printer = await repoGetPrinterById(deviceId);
      if (!printer) {
        throw new Error(`Printer with id ${deviceId} not found in registry`);
      }
      await savePreferences({ preferredPrinterId: deviceId });
    },

    async forgetPrinter(deviceId: string): Promise<void> {
      const printer = await repoGetPrinterById(deviceId);
      if (!printer) {
        return;
      }
      const adapter = getAdapter();
      try {
        await adapter.disconnectPrinter(printer.address);
      } catch {
        // Intentionally swallow — forget printer regardless of disconnect outcome
      }
      await repoDeletePrinter(deviceId);
      const prefs = await getPreferences();
      if (prefs.preferredPrinterId === deviceId) {
        await savePreferences({ preferredPrinterId: null });
      }
    },

    async getPreferredPrinter(): Promise<PrinterRecord | null> {
      const prefs = await getPreferences();
      const id = prefs.preferredPrinterId;
      if (!id) return null;
      return repoGetPrinterById(id);
    },

    async listPrinters(): Promise<PrinterRecord[]> {
      return repoListPrinters();
    },

    async mergeDiscoveredWithRegistry(
      discovered: PrinterRecord[]
    ): Promise<PrinterRecord[]> {
      const asDiscovery = discovered.map(d => ({
        id: d.id,
        name: d.name,
        address: d.address,
        transport: d.transport,
        capabilities: d.capabilities,
      }));
      await Promise.all(asDiscovery.map(d => upsertDiscovered(d)));
      return repoListPrinters();
    },
  };
}

export const registryService = createRegistryService();
