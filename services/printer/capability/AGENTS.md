# Printer Capability Service

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

Manages Android Bluetooth permissions, capability detection, and native module availability checks. Ensures printing features degrade gracefully on unsupported platforms.

## Modules

### `service.ts`

**Exports:** `PrinterCapabilityService` class

Capability checks:

```typescript
class PrinterCapabilityService {
  async checkBluetoothPermissions(): Promise<boolean>
  async requestBluetoothPermissions(): Promise<boolean>
  async isNativeModuleAvailable(): Promise<boolean>
  async canPrintThermal(): Promise<boolean>
  async getPlatformCapabilities(): Promise<PlatformCapabilities>
}
```

**Responsibilities:**

- Check Android BLUETOOTH and BLUETOOTH_ADMIN permissions
- Request permissions with user dialog
- Detect native module availability
- Determine if thermal printing is supported
- Return platform capabilities (BLE, Bluetooth Classic, TCP)

**Permission Checks (Android):**

- `android.permission.BLUETOOTH` — Scan and connect
- `android.permission.BLUETOOTH_ADMIN` — Discover devices
- `android.permission.BLUETOOTH_SCAN` — BLE scanning (API 31+)
- `android.permission.BLUETOOTH_CONNECT` — Device connection (API 31+)

**Platform Support:**

- iOS: BLE only (no Bluetooth Classic)
- Android: BLE, Bluetooth Classic, TCP
- Web: Disabled

### `index.ts`

Barrel export of capability service.

## Design Patterns

- **Capability Pattern**: Feature detection before use
- **Graceful Degradation**: Disabled printing on unsupported platforms
- **Lazy Checking**: Capabilities checked on demand

## Error Handling

- Permission denial handled gracefully (UI prompts user)
- Module detection errors don't crash app
- Platform detection failures default to safe mode (no printing)
- Permission request cancellation handled

## Integration Points

- **Registry Service**: Uses capabilities for discovery decision
- **Adapter Factory**: Uses module availability for adapter selection
