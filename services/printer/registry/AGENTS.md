# Printer Registry Service

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

Manages printer discovery via Bluetooth/BLE, device connection lifecycle, and registry persistence. Merges discovered devices with stored printer database.

## Modules

### `service.ts`

**Exports:** `PrinterRegistryService` class

Core registry service:

```typescript
class PrinterRegistryService {
  async discoverPrinters(): Promise<PrinterRecord[]>
  async connectPrinter(address: string): Promise<void>
  async disconnectPrinter(address: string): Promise<void>
  async getPrinterList(): Promise<PrinterRecord[]>
  async mergePrinterData(discovered: Device[], stored: Printer[]): Promise<PrinterRecord[]>
  async savePrinterPreferences(address: string, prefs: PrinterPreferences): Promise<void>
  async getPrinterPreferences(address: string): Promise<PrinterPreferences>
}
```

**Responsibilities:**

- Initiate BLE/Bluetooth discovery (platform-specific)
- Connect to discovered device
- Disconnect with cleanup
- Merge discovered devices with stored database
- Persist printer preferences
- Retrieve stored printer list

**Discovery Flow:**

1. Scan for BLE/Bluetooth devices
2. Filter by service UUIDs or manufacturer data
3. Merge with stored `printers` table
4. Return unified `PrinterRecord[]` list

### `index.ts`

Barrel export of registry service.

## Design Patterns

- **Service Locator Pattern**: Central registry for all printers
- **Merge Pattern**: Discovered + stored devices combined into single list
- **Lifecycle Pattern**: Connect/disconnect symmetry

## Error Handling

- Discovery timeout with retry logic
- Connection failures logged and propagated
- Preference save failures don't block discovery
- Cleanup executed on disconnect failure

## Integration Points

- **Storage Layer**: `PrinterRepository` for CRUD
- **Adapter Layer**: `PrinterAdapter` for connection
- **Capability Layer**: Permission checks before discovery
