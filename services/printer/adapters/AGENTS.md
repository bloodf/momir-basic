# Printer Adapter Layer

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

Adapter layer that abstracts printer transport mechanisms (native modules, Bluetooth, BLE, TCP) behind a common interface. Supports real native modules on physical devices and fallback to mock for testing.

## Modules

### `port.ts`

**Exports:** `PrinterAdapter` interface

Defines the contract for all printer adapters:

```typescript
interface PrinterAdapter {
  connect(address: string): Promise<void>
  disconnect(address: string): Promise<void>
  print(address: string, data: Uint8Array): Promise<void>
  isConnected(address: string): Promise<boolean>
}
```

### `native.ts`

**Exports:** `NativeModuleAdapter`

Wraps `NativeModules.ThermalPrinterDriver` with positional arguments. Handles:
- Connect via Bluetooth Classic/BLE address
- Print with ESC/POS byte array
- Disconnect cleanup
- Native module error handling

### `fake.ts`

**Exports:** `FakeAdapter`

Mock implementation for testing. Maintains in-memory device state without actual hardware calls.

### `factory.ts`

**Exports:** `createPrinterAdapter()`

Factory function that:
- Detects native module availability
- Returns `NativeModuleAdapter` on physical devices
- Falls back to `FakeAdapter` in development/testing
- Handles platform-specific module initialization

### `index.ts`

Barrel export of all adapter types.

## Design Patterns

- **Strategy Pattern**: Multiple implementations (native, fake) conform to single interface
- **Factory Pattern**: Adapter creation with automatic environment detection
- **Dependency Injection**: Adapters injected into services

## Error Handling

- Native module errors propagated with context
- Connection timeouts handled gracefully
- Disconnect cleanup always executed
